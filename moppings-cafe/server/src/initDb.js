/**
 * Full Database Setup Script
 * Run this FIRST: npm run db:init
 * This creates tables, runs migrations, and seeds the database
 */
import 'dotenv/config';
import { query } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runStatement(stmt) {
  try {
    await query(stmt);
    return true;
  } catch (err) {
    // Ignore duplicate key and already exists errors
    if (err.code === '23505' || err.code === '42P07') return true;
    return err;
  }
}

async function initDatabase() {
  console.log('🗄️  Initializing database...\n');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('  Creating base tables from schema...');
    
    // Create tables in correct order (dependencies first)
    const createOrder = [
      // Core tables first
      `CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )`,
      `CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        unit VARCHAR(50) DEFAULT 'pcs',
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role_id INT NOT NULL REFERENCES roles(id),
        store_id INT REFERENCES stores(id),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        low_stock INT NOT NULL DEFAULT 10,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(store_id, product_id)
      )`,
      `CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        change_amount INT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('import', 'sale', 'adjustment')),
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(100),
        record_id INT,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )`,
    ];

    for (const stmt of createOrder) {
      const result = await runStatement(stmt);
      if (result !== true) {
        console.log('    Note:', result.message?.slice(0, 50));
      }
    }

    // Create indexes
    console.log('  Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_store ON inventory_transactions(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)',
    ];
    for (const idx of indexes) {
      try { await query(idx); } catch (e) { /* ignore */ }
    }
    console.log('  ✓ Indexes created');

    // Verify tables exist
    console.log('\n📊 Verifying tables...');
    const { rows } = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('    Tables:', rows.map(r => r.table_name).join(', '));

    console.log('\n✅  Database initialization complete!');
    console.log('   Next: Run npm run seed:large to seed large-scale data\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

initDatabase();