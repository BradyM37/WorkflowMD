const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    // Clear old test data
    await pool.query(`DELETE FROM analysis_results WHERE location_id LIKE 'loc_test%' OR location_id LIKE 'loc_free%'`);
    console.log('✅ Cleared old test analysis results');

    // Keep the oauth_tokens for test users (loc_test_123 = pro, loc_free_789 = free)
    // These represent authenticated users who can analyze workflows

    console.log('');
    console.log('📋 Test accounts ready:');
    console.log('   - loc_test_123 (Pro subscriber)');
    console.log('   - loc_free_789 (Free user)');
    console.log('');
    console.log('🔄 Now when you analyze a workflow through the UI,');
    console.log('   the backend scoring algorithm will calculate the real score.');
    console.log('');
    console.log('🎉 Ready for testing!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
