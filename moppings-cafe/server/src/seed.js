/**
 * Seed script — run once: npm run seed
 * Populates: roles, permissions, role_permissions, 1 admin user, 2 stores, 10 products, inventory
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

async function seed() {
  console.log('🌱  Seeding database...');

  // ── Roles ──────────────────────────────────────────────────────────────────
  const rolesData = [
    { name: 'admin',   description: 'Full access' },
    { name: 'manager', description: 'Manage inventory and view reports' },
    { name: 'staff',   description: 'View inventory' },
  ];
  const roleMap = {};
  for (const r of rolesData) {
    const { rows } = await query(
      `INSERT INTO roles (name, description) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id, name`,
      [r.name, r.description]
    );
    roleMap[rows[0].name] = rows[0].id;
  }
  console.log('  ✓ Roles');

  // ── Permissions ────────────────────────────────────────────────────────────
  const permissionsData = [
    { key: 'view_dashboard',   label: 'View Dashboard' },
    { key: 'manage_inventory', label: 'Manage Inventory' },
    { key: 'manage_users',     label: 'Manage Users & Roles' },
  ];
  const permMap = {};
  for (const p of permissionsData) {
    const { rows } = await query(
      `INSERT INTO permissions (key, label) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label
       RETURNING id, key`,
      [p.key, p.label]
    );
    permMap[rows[0].key] = rows[0].id;
  }
  console.log('  ✓ Permissions');

  // ── Role-Permission matrix ─────────────────────────────────────────────────
  const matrix = {
    admin:   ['view_dashboard', 'manage_inventory', 'manage_users'],
    manager: ['view_dashboard', 'manage_inventory'],
    staff:   ['view_dashboard'],
  };
  for (const [roleName, perms] of Object.entries(matrix)) {
    for (const perm of perms) {
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [roleMap[roleName], permMap[perm]]
      );
    }
  }
  console.log('  ✓ Role-Permission assignments');

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    { name: 'Super Admin',  email: 'admin@moppings.cafe',   password: 'admin123',   role: 'admin' },
    { name: 'Jane Manager', email: 'manager@moppings.cafe', password: 'manager123', role: 'manager' },
    { name: 'Bob Staff',    email: 'staff@moppings.cafe',   password: 'staff123',   role: 'staff' },
  ];
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO users (name, email, password, role_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hashed, roleMap[u.role]]
    );
  }
  console.log('  ✓ Users (admin / manager / staff)');

  // ── Stores ─────────────────────────────────────────────────────────────────
  const storesData = [
    { name: 'Mopping\'s Central', location: '123 Brew St, District 1' },
    { name: 'Mopping\'s Lakeside', location: '88 Lake Ave, District 7' },
  ];
  const storeIds = [];
  for (const s of storesData) {
    const { rows } = await query(
      `INSERT INTO stores (name, location) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING id`,
      [s.name, s.location]
    );
    if (rows[0]) storeIds.push(rows[0].id);
  }
  // fetch all stores in case they already existed
  if (storeIds.length === 0) {
    const { rows } = await query('SELECT id FROM stores ORDER BY id LIMIT 2');
    rows.forEach((r) => storeIds.push(r.id));
  }
  console.log('  ✓ Stores');

  // ── Products ───────────────────────────────────────────────────────────────
  const productsData = [
    { name: 'Espresso Beans',  category: 'Coffee',    unit: 'kg' },
    { name: 'Milk',            category: 'Dairy',     unit: 'L' },
    { name: 'Sugar',           category: 'Condiment', unit: 'kg' },
    { name: 'Oat Milk',        category: 'Dairy',     unit: 'L' },
    { name: 'Matcha Powder',   category: 'Tea',       unit: 'kg' },
    { name: 'Caramel Syrup',   category: 'Syrup',     unit: 'bottle' },
    { name: 'Vanilla Syrup',   category: 'Syrup',     unit: 'bottle' },
    { name: 'Paper Cups (M)',  category: 'Packaging', unit: 'sleeve' },
    { name: 'Paper Cups (L)',  category: 'Packaging', unit: 'sleeve' },
    { name: 'Straw',           category: 'Packaging', unit: 'pack' },
  ];
  const productIds = [];
  for (const p of productsData) {
    const { rows } = await query(
      `INSERT INTO products (name, category, unit) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING id`,
      [p.name, p.category, p.unit]
    );
    if (rows[0]) productIds.push(rows[0].id);
  }
  if (productIds.length === 0) {
    const { rows } = await query('SELECT id FROM products ORDER BY id LIMIT 10');
    rows.forEach((r) => productIds.push(r.id));
  }
  console.log('  ✓ Products');

  // ── Inventory ──────────────────────────────────────────────────────────────
  const randomQty = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  for (const storeId of storeIds) {
    for (const productId of productIds) {
      await query(
        `INSERT INTO inventory (store_id, product_id, quantity, low_stock)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (store_id, product_id) DO NOTHING`,
        [storeId, productId, randomQty(3, 80), 10]
      );
    }
  }
  console.log('  ✓ Inventory rows');

  console.log('\n✅  Seed complete!');
  console.log('   admin@moppings.cafe   / admin123');
  console.log('   manager@moppings.cafe / manager123');
  console.log('   staff@moppings.cafe   / staff123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
