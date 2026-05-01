/**
 * Large-scale Seed script
 * Run once: npm run seed:large
 * 
 * Creates:
 * - 10 stores (instead of 2)
 * - 45 products across categories (coffee, tea, dairy, syrup, bakery, condiment)
 * - 10 admins, 3 managers, 10 staff users
 * - Inventory for all stores/products (~400 rows)
 * - 4000 inventory_transactions spread over last 30 days
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (daysBack) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date;
};

async function seed() {
  console.log('🌱  Starting large-scale seed...\n');

  // ── ROLES ────────────────────────────────────────────────────────────────────
  console.log('  Creating roles...');
  const rolesData = [
    { name: 'admin', description: 'Full system access' },
    { name: 'manager', description: 'Manage store inventory and reports' },
    { name: 'staff', description: 'Daily operations' },
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
  console.log('    ✓ Roles created\n');

  // ── PERMISSIONS ───────────────────────────────────────────────────────────
  console.log('  Creating permissions...');
  const permissionsData = [
    { key: 'view_dashboard', label: 'View Dashboard' },
    { key: 'manage_inventory', label: 'Manage Inventory' },
    { key: 'manage_users', label: 'Manage Users & Roles' },
    { key: 'manage_roles', label: 'Manage Roles & Permissions' },
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

  // Role-Permission matrix
  const matrix = {
    admin: ['view_dashboard', 'manage_inventory', 'manage_users', 'manage_roles'],
    manager: ['view_dashboard', 'manage_inventory'],
    staff: ['view_dashboard'],
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
  console.log('    ✓ Permissions & assignments created\n');

  // ── STORES ──────────────────────────────────────────────────────────────────
  console.log('  Creating 10 stores...');
  const storesData = [
    { name: "Mopping's Central HQ", location: '123 Main St, District 1, Ho Chi Minh City' },
    { name: "Mopping's D1 Express", location: '45 Le Loi Blvd, District 1' },
    { name: "Mopping's D7 Gold", location: '88 Nguyen Van Linh, District 7' },
    { name: "Mopping's D3 Lounge", location: '201 Dien Bien Phu, District 3' },
    { name: "Mopping's Binh Thanh", location: '55 Xo Viet Nghe Tinh, Binh Thanh' },
    { name: "Mopping's Go Vap", location: '120 Quang Trung, Go Vap' },
    { name: "Mopping's Tan Binh", location: '200 Cong Hoa, Tan Binh' },
    { name: "Mopping's Phu Nhuan", location: '78 Phan Dang Luu, Phu Nhuan' },
    { name: "Mopping's District 5", location: '35 Tran Phu, District 5' },
    { name: "Mopping's District 10", location: '200 3 Thang 2, District 10' },
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
  // Fallback if stores exist
  if (storeIds.length < 10) {
    const { rows } = await query('SELECT id FROM stores ORDER BY id LIMIT 10');
    storeIds.length = 0;
    rows.forEach(r => storeIds.push(r.id));
  }
  console.log(`    ✓ ${storeIds.length} stores created\n`);

  // ── PRODUCTS (45 items across 6 categories) ─────────────────────────────────
  console.log('  Creating 45 products...');
  const productsData = [
    // Coffee (12)
    { name: 'Espresso Blend', category: 'Coffee', price: 12.50, unit: 'kg' },
    { name: 'House Blend', category: 'Coffee', price: 10.00, unit: 'kg' },
    { name: 'Single Origin Ethiopian', category: 'Coffee', price: 22.00, unit: 'kg' },
    { name: 'Single Origin Colombian', category: 'Coffee', price: 18.00, unit: 'kg' },
    { name: 'Decaf Beans', category: 'Coffee', price: 14.00, unit: 'kg' },
    { name: 'Cold Brew Concentrate', category: 'Coffee', price: 25.00, unit: 'L' },
    { name: 'Espresso Beans (Dark)', category: 'Coffee', price: 15.00, unit: 'kg' },
    { name: 'Aeropress Beans', category: 'Coffee', price: 16.00, unit: 'kg' },
    { name: 'French Press Blend', category: 'Coffee', price: 13.00, unit: 'kg' },
    { name: 'Organic Arabica', category: 'Coffee', price: 20.00, unit: 'kg' },
    { name: 'Robusta Blend', category: 'Coffee', price: 8.00, unit: 'kg' },
    { name: 'Mocha Blend', category: 'Coffee', price: 17.00, unit: 'kg' },
    // Tea (8)
    { name: 'Earl Grey', category: 'Tea', price: 8.00, unit: 'kg' },
    { name: 'Green Tea', category: 'Tea', price: 9.00, unit: 'kg' },
    { name: 'Matcha Powder', category: 'Tea', price: 45.00, unit: 'kg' },
    { name: 'Chai Masala', category: 'Tea', price: 12.00, unit: 'kg' },
    { name: 'Oolong Tea', category: 'Tea', price: 15.00, unit: 'kg' },
    { name: 'Jasmine Green', category: 'Tea', price: 14.00, unit: 'kg' },
    { name: 'English Breakfast', category: 'Tea', price: 7.50, unit: 'kg' },
    { name: 'Peach Tea Flavor', category: 'Tea', price: 18.00, unit: 'kg' },
    // Dairy (8)
    { name: 'Fresh Milk', category: 'Dairy', price: 3.50, unit: 'L' },
    { name: 'Oat Milk', category: 'Dairy', price: 5.50, unit: 'L' },
    { name: 'Almond Milk', category: 'Dairy', price: 5.00, unit: 'L' },
    { name: 'Soy Milk', category: 'Dairy', price: 4.00, unit: 'L' },
    { name: 'Coconut Milk', category: 'Dairy', price: 4.50, unit: 'L' },
    { name: 'Heavy Cream', category: 'Dairy', price: 6.00, unit: 'L' },
    { name: 'Half & Half', category: 'Dairy', price: 3.00, unit: 'L' },
    { name: 'Butter', category: 'Dairy', price: 8.00, unit: 'kg' },
    // Syrups (8)
    { name: 'Vanilla Syrup', category: 'Syrup', price: 12.00, unit: 'bottle' },
    { name: 'Caramel Syrup', category: 'Syrup', price: 12.00, unit: 'bottle' },
    { name: 'Hazelnut Syrup', category: 'Syrup', price: 13.00, unit: 'bottle' },
    { name: 'Mocha Syrup', category: 'Syrup', price: 14.00, unit: 'bottle' },
    { name: 'Peppermint Syrup', category: 'Syrup', price: 11.00, unit: 'bottle' },
    { name: 'Irish Cream Syrup', category: 'Syrup', price: 15.00, unit: 'bottle' },
    { name: 'Raspberry Syrup', category: 'Syrup', price: 11.00, unit: 'bottle' },
    { name: 'Lavender Syrup', category: 'Syrup', price: 13.00, unit: 'bottle' },
    // Bakery (5)
    { name: 'Croissant', category: 'Bakery', price: 2.50, unit: 'pcs' },
    { name: 'Blueberry Muffin', category: 'Bakery', price: 2.00, unit: 'pcs' },
    { name: 'Chocolate Muffin', category: 'Bakery', price: 2.00, unit: 'pcs' },
    { name: 'Banana Bread', category: 'Bakery', price: 3.50, unit: 'slice' },
    { name: 'Almond Danish', category: 'Bakery', price: 3.00, unit: 'pcs' },
    // Condiments/Packaging (4)
    { name: 'Sugar Packets', category: 'Condiment', price: 0.10, unit: 'pcs' },
    { name: 'Honey Sticks', category: 'Condiment', price: 0.50, unit: 'pcs' },
    { name: 'Paper Cups (M)', category: 'Packaging', price: 1.50, unit: 'sleeve' },
    { name: 'Paper Cups (L)', category: 'Packaging', price: 1.80, unit: 'sleeve' },
  ];
  const productIds = [];
  for (const p of productsData) {
    const { rows } = await query(
      `INSERT INTO products (name, category, price, unit) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING RETURNING id`,
      [p.name, p.category, p.price, p.unit]
    );
    if (rows[0]) productIds.push(rows[0].id);
  }
  if (productIds.length < 45) {
    const { rows } = await query('SELECT id FROM products ORDER BY id LIMIT 45');
    productIds.length = 0;
    rows.forEach(r => productIds.push(r.id));
  }
  console.log(`    ✓ ${productIds.length} products created\n`);

  // ── INVENTORY INITIALIZATION ───────────────────────────────────────────────
  console.log('  Creating inventory for all stores/products (~450 rows)...');
  for (const storeId of storeIds) {
    for (const productId of productIds) {
      // Random initial quantity between 5-100
      let qty = randomInt(5, 100);
      // Create some low stock items (20% chance)
      if (Math.random() < 0.2) qty = randomInt(1, 8);
      // Create some high stock items (20% chance)
      if (Math.random() < 0.2) qty = randomInt(80, 150);

      await query(
        `INSERT INTO inventory (store_id, product_id, quantity, low_stock)
         VALUES ($1, $2, $3, 10)
         ON CONFLICT (store_id, product_id) DO UPDATE SET quantity = $3`,
        [storeId, productId, qty]
      );
    }
  }
  console.log('    ✓ Inventory initialized\n');

  // ── USERS (1 admin + 3 managers + 10 staff = 14 users) ─────────────────────
  console.log('  Creating users...');
  const users = [
    // Admins (1 admin)
    { name: 'Super Admin', email: 'admin@moppings.cafe', password: 'admin123', role: 'admin' },
    { name: 'System Admin', email: 'sysadmin@moppings.cafe', password: 'admin123', role: 'admin' },
    { name: 'Ops Admin', email: 'ops@moppings.cafe', password: 'admin123', role: 'admin' },
    { name: 'IT Admin', email: 'it@moppings.cafe', password: 'admin123', role: 'admin' },
    { name: 'Finance Admin', email: 'finance@moppings.cafe', password: 'admin123', role: 'admin' },
    // Managers (3)
    { name: 'Central Manager', email: 'central@moppings.cafe', password: 'manager123', role: 'manager' },
    { name: 'South District Manager', email: 'south@moppings.cafe', password: 'manager123', role: 'manager' },
    { name: 'North District Manager', email: 'north@moppings.cafe', password: 'manager123', role: 'manager' },
    // Staff (10) - distributed across stores
    { name: 'Staff D1-1', email: 'staff1@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff D1-2', email: 'staff2@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff D7-1', email: 'staff3@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff D7-2', email: 'staff4@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff D3-1', email: 'staff5@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff Binh Thanh', email: 'staff6@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff Go Vap', email: 'staff7@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff Tan Binh', email: 'staff8@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff Phu Nhuan', email: 'staff9@moppings.cafe', password: 'staff123', role: 'staff' },
    { name: 'Staff D5', email: 'staff10@moppings.cafe', password: 'staff123', role: 'staff' },
  ];
  const userIds = [];
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role_id, store_id)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [u.name, u.email, hashed, roleMap[u.role], storeIds[userIds.length % storeIds.length] || 1]
    );
    if (rows[0]) userIds.push(rows[0].id);
  }
  if (userIds.length === 0) {
    const { rows } = await query('SELECT id FROM users ORDER BY id');
    rows.forEach(r => userIds.push(r.id));
  }
  console.log(`    ✓ ${userIds.length} users created\n`);

  // ── INVENTORY TRANSACTIONS (4000 records over 30 days) ────────────────────────
  console.log('  Creating 4000 inventory transactions (this takes a while)...');
  
  // Pre-fetch current inventory
  const { rows: inventoryRows } = await query('SELECT id, store_id, product_id, quantity FROM inventory');
  const inventoryMap = new Map();
  inventoryRows.forEach(r => {
    inventoryMap.set(`${r.store_id}-${r.product_id}`, r);
  });

  const transactionBatchSize = 500;
  let totalTransactions = 0;
  
  for (let batch = 0; batch < 8; batch++) {
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (let i = 0; i < transactionBatchSize; i++) {
      // Select random store and product combination
      const storeId = storeIds[randomInt(0, storeIds.length - 1)];
      const productId = productIds[randomInt(0, productIds.length - 1)];
      const invKey = `${storeId}-${productId}`;
      const inventoryRec = inventoryMap.get(invKey);
      
      if (!inventoryRec) continue;

      // Random transaction type: import (40%), sale (50%), adjustment (10%)
      const rand = Math.random();
      let type;
      if (rand < 0.4) type = 'import';
      else if (rand < 0.9) type = 'sale';
      else type = 'adjustment';

      // Change amount based on type
      let changeAmount;
      if (type === 'import') {
        changeAmount = randomInt(5, 30); // positive
      } else if (type === 'sale') {
        changeAmount = -randomInt(1, 10); // negative (consumption)
      } else {
        changeAmount = randomInt(-5, 10); // can be positive or negative
      }

      const createdAt = randomDate(30);
      const createdBy = userIds[randomInt(0, userIds.length - 1)];

      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`);
      params.push(storeId, productId, changeAmount, type, createdBy, createdAt);
      paramIndex += 6;
    }

    if (values.length > 0) {
      await query(
        `INSERT INTO inventory_transactions (store_id, product_id, change_amount, type, created_by, created_at)
         VALUES ${values.join(', ')}`,
        params
      );
      totalTransactions += values.length;
      console.log(`    ✓ Batch ${batch + 1}/8 done (${totalTransactions} transactions)`);
    }
  }

  // Update inventory quantities based on transactions
  console.log('  Updating inventory based on transactions...');
  await query(`
    WITH aggregated AS (
      SELECT store_id, product_id, SUM(change_amount) as net_change
      FROM inventory_transactions
      GROUP BY store_id, product_id
    )
    UPDATE inventory i
    SET quantity = GREATEST(0, i.quantity + a.net_change)
    FROM aggregated a
    WHERE i.store_id = a.store_id AND i.product_id = a.product_id
  `);
  console.log('    ✓ Inventory synchronized with transactions\n');

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log('='.repeat(50));
  console.log('✅  Large-scale seed complete!\n');
  console.log('   📊 Data summary:');
  console.log(`      - Stores: ${storeIds.length}`);
  console.log(`      - Products: ${productIds.length}`);
  console.log(`      - Users: ${userIds.length} (10 admin, 3 manager, 10 staff)`);
  console.log(`      - Inventory rows: ${storeIds.length * productIds.length}`);
  console.log(`      - Transactions: ${totalTransactions}\n`);
  console.log('   🔑 Login credentials:');
  console.log('      admin@moppings.cafe   / admin123 (full access)');
  console.log('      central@moppings.cafe / manager123 (store manager)');
  console.log('      staff1@moppings.cafe  / staff123 (staff)\n');
  console.log('='.repeat(50));

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});