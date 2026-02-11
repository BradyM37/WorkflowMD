import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

// Database initialization
export async function initDatabase() {
  try {
    // Create users table first (referenced by oauth_tokens)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        company_name VARCHAR(255),
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token)`);

    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`);

    // Create/update oauth_tokens table with user_id link
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        location_id VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP,
        stripe_customer_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255),
        company_name VARCHAR(255),
        subscription_started_at TIMESTAMP,
        subscription_ends_at TIMESTAMP,
        subscription_id VARCHAR(255),
        plan_type VARCHAR(50) DEFAULT 'free',
        trial_ends_at TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(255) NOT NULL,
        workflow_id VARCHAR(255) NOT NULL,
        workflow_name VARCHAR(255),
        health_score INTEGER NOT NULL,
        issues_found INTEGER,
        results JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id VARCHAR(255) PRIMARY KEY,
        processed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_location_created 
      ON analysis_results(location_id, created_at DESC)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_health_score 
      ON analysis_results(health_score DESC)
    `);

    // Execution logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS execution_logs (
        id VARCHAR(255) PRIMARY KEY,
        workflow_id VARCHAR(255) NOT NULL,
        location_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        failed_action_id VARCHAR(255),
        failed_action_name VARCHAR(255),
        error_message TEXT,
        execution_time_ms INTEGER,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow 
      ON execution_logs(workflow_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_execution_logs_status 
      ON execution_logs(status)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_execution_logs_date 
      ON execution_logs(executed_at DESC)
    `);

    // Alert settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_settings (
        id VARCHAR(255) PRIMARY KEY,
        location_id VARCHAR(255) NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT true,
        failure_threshold INTEGER DEFAULT 3,
        time_window_hours INTEGER DEFAULT 24,
        alert_on_critical BOOLEAN DEFAULT true,
        alert_email VARCHAR(255),
        webhook_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scan schedules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_schedules (
        id VARCHAR(255) PRIMARY KEY,
        location_id VARCHAR(255) NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT true,
        frequency VARCHAR(50) DEFAULT 'daily',
        preferred_time VARCHAR(10) DEFAULT '02:00',
        timezone VARCHAR(100) DEFAULT 'America/Chicago',
        scan_scope VARCHAR(50) DEFAULT 'active',
        selected_workflow_ids TEXT,
        last_scan_at TIMESTAMP,
        next_scan_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_schedules_location 
      ON scan_schedules(location_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_schedules_next 
      ON scan_schedules(next_scan_at)
    `);

    // Scan history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_history (
        id VARCHAR(255) PRIMARY KEY,
        schedule_id VARCHAR(255),
        location_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        workflows_scanned INTEGER DEFAULT 0,
        issues_found INTEGER DEFAULT 0,
        critical_issues INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        summary JSONB
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_history_location 
      ON scan_history(location_id)
    `);

    // Dismissed insights table (for hiding insights temporarily)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dismissed_insights (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(255) NOT NULL,
        insight_id VARCHAR(255) NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(location_id, insight_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dismissed_insights_location 
      ON dismissed_insights(location_id)
    `);

    // Addressed insights table (for tracking action taken)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS addressed_insights (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(255) NOT NULL,
        insight_id VARCHAR(255) NOT NULL,
        addressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(location_id, insight_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_addressed_insights_location 
      ON addressed_insights(location_id)
    `);

    // Sync state table for tracking conversation sync status
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_state (
        location_id VARCHAR(255) PRIMARY KEY,
        sync_status VARCHAR(50) DEFAULT 'pending',
        last_sync_at TIMESTAMP,
        error_message TEXT
      )
    `);

    // Conversations table for response tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
        ghl_conversation_id VARCHAR(255) UNIQUE NOT NULL,
        location_id VARCHAR(255) NOT NULL,
        contact_id VARCHAR(255),
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        channel VARCHAR(50),
        first_inbound_at TIMESTAMP,
        first_response_at TIMESTAMP,
        response_time_seconds INTEGER,
        assigned_user_id VARCHAR(255),
        assigned_user_name VARCHAR(255),
        status VARCHAR(50),
        is_missed BOOLEAN DEFAULT false,
        last_message_at TIMESTAMP,
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_location ON conversations(location_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_first_inbound ON conversations(first_inbound_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_is_missed ON conversations(is_missed)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_assigned_user ON conversations(assigned_user_id)`);

    // Daily metrics aggregation table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id SERIAL PRIMARY KEY,
        location_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        total_conversations INTEGER DEFAULT 0,
        new_conversations INTEGER DEFAULT 0,
        avg_response_time INTEGER,
        median_response_time INTEGER,
        min_response_time INTEGER,
        max_response_time INTEGER,
        responses_under_1min INTEGER DEFAULT 0,
        responses_under_5min INTEGER DEFAULT 0,
        responses_under_15min INTEGER DEFAULT 0,
        responses_under_1hr INTEGER DEFAULT 0,
        responses_over_1hr INTEGER DEFAULT 0,
        missed_conversations INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(location_id, date)
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_metrics_location_date ON daily_metrics(location_id, date)`);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Initialize on module load
initDatabase().catch(console.error);