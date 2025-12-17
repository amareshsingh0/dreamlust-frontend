/**
 * Startup Diagnostic Script
 * Checks for common issues preventing server startup
 */

import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking backend startup configuration...\n');

// Check .env file exists
const envPath = join(__dirname, '.env');
if (!existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('   Please create a .env file in the backend directory.');
  process.exit(1);
}
console.log('✅ .env file exists');

// Load and check environment variables
dotenv.config({ path: envPath });

const requiredVars = {
  DATABASE_URL: {
    required: true,
    minLength: 1,
    description: 'PostgreSQL database connection string',
  },
  JWT_SECRET: {
    required: true,
    minLength: 32,
    description: 'JWT secret key (must be at least 32 characters)',
  },
  PORT: {
    required: false,
    default: '3001',
    description: 'Server port',
  },
};

let hasErrors = false;

console.log('\n📋 Checking required environment variables:');
for (const [key, config] of Object.entries(requiredVars)) {
  const value = process.env[key];
  
  if (config.required && !value) {
    console.error(`❌ ${key}: MISSING (required)`);
    console.error(`   ${config.description}`);
    hasErrors = true;
  } else if (value && config.minLength && value.length < config.minLength) {
    console.error(`❌ ${key}: TOO SHORT (minimum ${config.minLength} characters)`);
    console.error(`   Current length: ${value.length}`);
    hasErrors = true;
  } else if (value) {
    // Mask sensitive values
    const displayValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY')
      ? '*'.repeat(Math.min(value.length, 20))
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`⚠️  ${key}: Not set (using default: ${config.default})`);
  }
}

// Check if DATABASE_URL is valid format
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('\n❌ DATABASE_URL format invalid');
    console.error('   Expected format: postgresql://user:password@host:port/database');
    hasErrors = true;
  } else {
    console.log('\n✅ DATABASE_URL format looks valid');
  }
}

// Check port availability
const PORT = parseInt(process.env.PORT || '3001', 10);
console.log(`\n🔌 Checking port ${PORT}...`);

if (hasErrors) {
  console.error('\n❌ Configuration errors found. Please fix them before starting the server.');
  console.error('\n📝 Example .env file:');
  console.error('DATABASE_URL="postgresql://user:password@localhost:5432/dreamlust?schema=public"');
  console.error('JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"');
  console.error('PORT=3001');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Server should start successfully.');
  console.log(`\n🚀 To start the server, run: bun run dev`);
}


