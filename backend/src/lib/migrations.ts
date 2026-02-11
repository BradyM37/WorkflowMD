/**
 * Database Migration Runner
 * Automatically runs pending migrations on startup
 */

import { pool } from './database';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

/**
 * Ensure migrations tracking table exists
 */
async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  const result = await pool.query('SELECT name FROM _migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(name: string): Promise<void> {
  await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
}

/**
 * Run a single migration file
 */
async function runMigration(filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error: any) {
      // Ignore "already exists" errors for idempotent migrations
      if (!error.message.includes('already exists') && 
          !error.message.includes('duplicate key')) {
        throw error;
      }
    }
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  logger.info('Checking for pending database migrations...');
  
  try {
    await ensureMigrationsTable();
    
    const executed = await getExecutedMigrations();
    
    // Find migrations directory
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.info('No migrations directory found');
      return;
    }
    
    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (003_xxx.sql comes after 002_xxx.sql)
    
    let ranCount = 0;
    
    for (const file of files) {
      if (!executed.includes(file)) {
        logger.info(`Running migration: ${file}`);
        
        try {
          await runMigration(path.join(migrationsDir, file));
          await markMigrationExecuted(file);
          ranCount++;
          logger.info(`✅ Migration completed: ${file}`);
        } catch (error: any) {
          logger.error(`❌ Migration failed: ${file}`, {}, error);
          throw error;
        }
      }
    }
    
    if (ranCount > 0) {
      logger.info(`✅ Ran ${ranCount} migration(s) successfully`);
    } else {
      logger.info('✅ Database is up to date');
    }
  } catch (error) {
    logger.error('Database migration check failed', {}, error as Error);
    // Don't crash the server, but log the error
  }
}
