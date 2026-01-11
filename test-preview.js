/**
 * Test Preview Server
 * Run: bun run test-preview.js
 * This will build and start preview server to test if it works
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testPreview() {
  console.log('🔨 Step 1: Building frontend...\n');
  try {
    const { stdout, stderr } = await execAsync('bun run build');
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log('✅ Build completed successfully!\n');
  } catch (error) {
    console.error('❌ Build failed!');
    console.error(error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }

  console.log('🚀 Step 2: Starting preview server...\n');
  console.log('📝 Open http://localhost:4173 in your browser to test\n');
  console.log('⏹️  Press Ctrl+C to stop the server\n');
  console.log('─'.repeat(50) + '\n');

  const preview = exec('bun run preview', { 
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  preview.on('error', (error) => {
    console.error('❌ Failed to start preview server:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping preview server...');
    preview.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    preview.kill();
    process.exit(0);
  });
}

testPreview().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

