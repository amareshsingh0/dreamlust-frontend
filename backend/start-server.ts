/**
 * Server Startup Wrapper
 * Catches any errors during server initialization
 */

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

try {
  console.log('🚀 Starting server...');
  await import('./src/server.ts');
} catch (error) {
  console.error('❌ Fatal error during server startup:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
}

