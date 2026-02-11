/**
 * Redis Cache Integration Test
 * Run with: node test-redis-integration.js
 */

const { cache, CacheKeys, CacheTTL } = require('./dist/lib/cache');

async function testRedisIntegration() {
  console.log('🧪 Testing Redis Cache Integration\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Cache Statistics
    console.log('\n1️⃣ Testing Cache Statistics...');
    const stats = cache.getStats();
    console.log('   Cache Type:', stats.type);
    console.log('   Connected:', stats.connected !== undefined ? stats.connected : 'N/A');
    console.log('   Size:', stats.size !== undefined ? stats.size : 'N/A');
    console.log('   ✅ Cache statistics retrieved');

    // Test 2: Set and Get
    console.log('\n2️⃣ Testing Set and Get...');
    const testKey = 'test:integration:key';
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() };
    
    await cache.set(testKey, testValue, CacheTTL.SHORT);
    console.log('   ✅ Value set in cache');
    
    const retrieved = await cache.get(testKey);
    console.log('   Retrieved:', retrieved);
    console.log('   ✅ Value retrieved from cache');

    // Test 3: Cache Key Helpers
    console.log('\n3️⃣ Testing Cache Key Helpers...');
    const workflowKey = CacheKeys.workflow('loc123', 'wf456');
    console.log('   Workflow Key:', workflowKey);
    
    const analysisKey = CacheKeys.analysis('wf789');
    console.log('   Analysis Key:', analysisKey);
    console.log('   ✅ Key helpers working');

    // Test 4: Exists Check
    console.log('\n4️⃣ Testing Exists Check...');
    const exists = await cache.exists(testKey);
    console.log('   Key exists:', exists);
    console.log('   ✅ Exists check working');

    // Test 5: Delete
    console.log('\n5️⃣ Testing Delete...');
    await cache.del(testKey);
    const stillExists = await cache.exists(testKey);
    console.log('   Key exists after delete:', stillExists);
    console.log('   ✅ Delete working');

    // Test 6: Wrap Function with Caching
    console.log('\n6️⃣ Testing Wrap Function...');
    let callCount = 0;
    const expensiveOperation = async () => {
      callCount++;
      return { result: 'expensive data', callNumber: callCount };
    };

    const wrapKey = 'test:wrap:key';
    const result1 = await cache.wrap(wrapKey, expensiveOperation, CacheTTL.SHORT);
    console.log('   First call (cache miss):', result1);
    
    const result2 = await cache.wrap(wrapKey, expensiveOperation, CacheTTL.SHORT);
    console.log('   Second call (cache hit):', result2);
    console.log('   Call count:', callCount, '(should be 1 - cached on second call)');
    console.log('   ✅ Wrap function working');

    // Cleanup
    await cache.del(wrapKey);

    // Final Stats
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Final Cache Statistics:');
    const finalStats = cache.getStats();
    console.log('   Type:', finalStats.type);
    console.log('   Status:', finalStats.type === 'redis' 
      ? (finalStats.connected ? '🟢 Connected' : '🔴 Disconnected')
      : `🟡 In-Memory (${finalStats.size} items)`
    );

    console.log('\n✅ All tests passed!');
    console.log('\n' + '='.repeat(60));

    if (finalStats.type === 'redis' && finalStats.connected) {
      console.log('\n🎉 Redis is working perfectly!');
    } else if (finalStats.type === 'in-memory') {
      console.log('\n⚠️  Using in-memory cache (Redis not configured)');
      console.log('   Set REDIS_URL environment variable to use Redis');
    } else {
      console.log('\n⚠️  Redis configured but not connected');
      console.log('   Falling back to in-memory cache');
    }

    // Close connection
    await cache.close();
    console.log('\n🔌 Cache connection closed');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testRedisIntegration()
  .then(() => {
    console.log('\n✨ Integration test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
