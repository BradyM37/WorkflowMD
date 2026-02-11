/**
 * Database Migration Runner
 * Runs all SQL migration files in the migrations directory
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Run in order

    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✅ ${file} completed successfully\n`);
      } catch (error) {
        console.error(`❌ Error running ${file}:`, error.message);
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Table already exists, continuing...\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
