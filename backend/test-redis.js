/**
 * Quick Redis Connection Test Script
 * Run: bun run test-redis.js
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('🔍 Testing Redis connection...');
console.log(`📍 Redis URL: ${redisUrl}\n`);

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: () => null, // Don't retry
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
  console.log('\n💡 Solutions:');
  console.log('   1. Make sure Redis is running: docker run -d --name redis -p 6379:6379 redis:latest');
  console.log('   2. Check REDIS_URL in .env file');
  console.log('   3. Verify Redis is accessible on localhost:6379');
  process.exit(1);
});

redis.on('connect', () => {
  console.log('✅ Redis connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis ready!');
  
  // Test ping
  redis.ping()
    .then((result) => {
      console.log(`✅ Redis ping successful: ${result}`);
      console.log('\n🎉 Redis is working correctly!');
      redis.quit();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Redis ping failed:', error.message);
      redis.quit();
      process.exit(1);
    });
});

// Attempt to connect
redis.connect().catch((error) => {
  console.error('❌ Failed to connect to Redis:', error.message);
  console.log('\n💡 Make sure Redis is running on localhost:6379');
  process.exit(1);
});

