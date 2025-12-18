/**
 * Background Workers Entry Point
 * Run this file to start all background workers
 * 
 * Usage: bun run src/workers.ts
 */

import { initializeWorkers } from './lib/queues/workers/index';

console.log('🚀 Starting background workers...');

try {
  const workers = initializeWorkers();

  if (workers.length === 0) {
    console.warn('⚠️  No workers initialized. Make sure Redis is running and REDIS_URL is set in .env');
    console.log('💡 Workers will start automatically when Redis is available');
    // Keep process running
    setInterval(() => {
      // Heartbeat to keep process alive
    }, 60000);
  } else {
    console.log(`✅ ${workers.length} workers started and running`);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down workers...');
    await Promise.all(workers.map((worker) => worker?.close?.()).filter(Boolean));
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down workers...');
    await Promise.all(workers.map((worker) => worker?.close?.()).filter(Boolean));
    process.exit(0);
  });

  // Keep process alive
  setInterval(() => {
    // Heartbeat to keep process alive
  }, 60000);
} catch (error) {
  console.error('❌ Failed to start workers:', error);
  process.exit(1);
}
