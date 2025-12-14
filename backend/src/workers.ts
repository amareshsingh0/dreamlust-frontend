/**
 * Background Workers Entry Point
 * Run this file to start all background workers
 * 
 * Usage: bun run src/workers.ts
 */

import { initializeWorkers } from './lib/queues/workers';

console.log('🚀 Starting background workers...');

const workers = initializeWorkers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down workers...');
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down workers...');
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
});

console.log('✅ All workers started and running');
