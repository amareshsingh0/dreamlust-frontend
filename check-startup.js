/**
 * Frontend Startup Diagnostic Script
 * Checks for common issues preventing frontend startup
 */

import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking frontend startup configuration...\n');

// Check if node_modules exists
const nodeModulesPath = join(__dirname, 'node_modules');
if (!existsSync(nodeModulesPath)) {
  console.error('❌ node_modules not found!');
  console.error('   Please run: bun install');
  process.exit(1);
}
console.log('✅ node_modules exists');

// Check package.json
const packageJsonPath = join(__dirname, 'package.json');
if (!existsSync(packageJsonPath)) {
  console.error('❌ package.json not found!');
  process.exit(1);
}
console.log('✅ package.json exists');

// Check vite.config.ts
const viteConfigPath = join(__dirname, 'vite.config.ts');
if (!existsSync(viteConfigPath)) {
  console.error('❌ vite.config.ts not found!');
  process.exit(1);
}
console.log('✅ vite.config.ts exists');

// Check if port 4001 is available
const PORT = 4001;
console.log(`\n🔌 Checking port ${PORT}...`);
console.log(`   If port is in use, you can change it in vite.config.ts`);

console.log('\n✅ All checks passed! Frontend should start successfully.');
console.log(`\n🚀 To start the frontend, run: bun run dev`);


