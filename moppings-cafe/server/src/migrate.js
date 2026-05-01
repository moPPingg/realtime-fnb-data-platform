/**
 * Database Migration Script
 * Run this FIRST before npm run seed:large
 * Adds: price column to products, store_id to users, inventory_transactions table
 */
import 'dotenv/config';
import { query } from './db.js';

async function migrate() {
  console.log('🗄️  Running database migrations...\n');

  try {
    // Add price column to products
    await query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL DEFAULT 0.00
    `);
    console.log('  ✓ Added price column to products');

    // Add store_id column to users
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id)
    `);
    console.log('  ✓ Added store_id column to users');

    // Create inventory_transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id              SERIAL PRIMARY KEY,
        store_id        INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        change_amount   INT NOT NULL,
        type            VARCHAR(20) NOT NULL CHECK (type IN ('import', 'sale', 'adjustment')),
        created_by      INT REFERENCES users(id),
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created inventory_transactions table');

    // Add indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_store ON inventory_transactions(store_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type)`);
    console.log('  ✓ Created indexes');

    console.log('\n✅  Migration complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();