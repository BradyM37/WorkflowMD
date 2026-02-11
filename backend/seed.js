const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    // Insert test location with pro subscription
    await pool.query(`
      INSERT INTO oauth_tokens (location_id, company_id, access_token, refresh_token, expires_at, subscription_status)
      VALUES 
        ('loc_test_123', 'comp_test_456', 'fake_access_token', 'fake_refresh_token', NOW() + INTERVAL '1 day', 'pro'),
        ('loc_free_789', 'comp_test_456', 'fake_access_token_2', 'fake_refresh_token_2', NOW() + INTERVAL '1 day', 'free')
      ON CONFLICT (location_id) DO NOTHING
    `);
    console.log('✅ Test locations created');

    // Insert test analysis results
    await pool.query(`
      INSERT INTO analysis_results (location_id, workflow_id, workflow_name, health_score, issues_found, results)
      VALUES 
        ('loc_test_123', 'wf_001', 'Lead Nurture Sequence', 72, 4, '{"issues": [{"type": "high", "title": "Missing error handling", "description": "API call has no fallback", "fix": "Add try-catch with retry logic"}], "grade": "Good"}'),
        ('loc_test_123', 'wf_002', 'Appointment Reminder', 45, 7, '{"issues": [{"type": "critical", "title": "Infinite loop detected", "description": "Workflow loops back without exit condition", "fix": "Add counter or exit condition"}], "grade": "High Risk"}'),
        ('loc_test_123', 'wf_003', 'Payment Recovery', 28, 9, '{"issues": [{"type": "critical", "title": "No retry logic", "description": "Payment webhook has no retry", "fix": "Add exponential backoff"}], "grade": "Critical"}'),
        ('loc_free_789', 'wf_004', 'Welcome Email', 85, 2, '{"issues": [{"type": "low", "title": "Could optimize timing", "description": "Delay could be shorter", "fix": "Reduce wait from 24h to 4h"}], "grade": "Good"}')`);
    console.log('✅ Test analysis results created');

    console.log('🎉 Seed complete! Check your Supabase dashboard.');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
