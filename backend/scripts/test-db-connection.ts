#!/usr/bin/env bun
/**
 * Database Connection Test Script
 * 
 * This script tests the database connection and provides helpful error messages
 * for common issues.
 * 
 * Usage: bun run scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Testing database connection...\n');

// Check if DATABASE_URL is set
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in your .env file!');
  console.error('\n📝 Please add DATABASE_URL to your .env file:');
  console.error('   DATABASE_URL="postgresql://user:password@localhost:5432/dreamlust?schema=public"');
  console.error('\n💡 For PostgreSQL: postgresql://user:password@localhost:5432/database_name?schema=public');
  console.error('💡 For MySQL: mysql://user:password@localhost:3306/database_name');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log(`   Database: ${DATABASE_URL.split('@')[1]?.split('/')[1]?.split('?')[0] || 'unknown'}`);

// Try to connect
const prisma = new PrismaClient({
  log: ['error'],
});

async function testConnection() {
  try {
    console.log('\n🔄 Attempting to connect to database...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test query to creators table
    try {
      const count = await prisma.creator.count();
      console.log(`✅ Creators table exists (${count} records found)`);
    } catch (tableError: any) {
      if (tableError.code === 'P2021' || tableError.code === '42P01') {
        console.error('\n❌ Creators table does not exist!');
        console.error('💡 Run migrations to create tables:');
        console.error('   bun run db:push        (development - syncs schema)');
        console.error('   bun run db:migrate     (creates migration files)');
      } else {
        throw tableError;
      }
    }
    
    console.log('\n✅ All database checks passed!');
    console.log('💡 Your database is ready to use.');
    
  } catch (error: any) {
    console.error('\n❌ Database connection failed!\n');
    
    // Provide specific error messages
    if (error.code === 'P1001') {
      console.error('🔴 Error: Can\'t reach database server');
      console.error('\n💡 Most common causes:');
      console.error('   1. Database server is not running');
      console.error('   2. Wrong host/port in DATABASE_URL');
      console.error('   3. Firewall blocking the connection');
      console.error('\n📝 Solutions:');
      console.error('   • Start your database server');
      console.error('   • For PostgreSQL: sudo systemctl start postgresql');
      console.error('   • For Docker: docker-compose up -d postgres');
      console.error('   • Check your DATABASE_URL connection string');
    } else if (error.code === 'P1017') {
      console.error('🔴 Error: Server has closed the connection');
      console.error('\n💡 The database server closed the connection. Try:');
      console.error('   • Restart your database server');
      console.error('   • Check database server logs');
      console.error('   • Verify connection pool settings');
    } else if (error.code === 'P1000' || error.message?.includes('authentication')) {
      console.error('🔴 Error: Authentication failed');
      console.error('\n💡 Wrong username or password in DATABASE_URL');
      console.error('   Check your .env file and verify credentials');
    } else if (error.code === 'P1003' || error.message?.includes('does not exist')) {
      console.error('🔴 Error: Database does not exist');
      console.error('\n💡 Create the database first:');
      console.error('   CREATE DATABASE dreamlust;');
      console.error('   (Run this in your database client)');
    } else {
      console.error('🔴 Unexpected error:');
      console.error(`   Code: ${error.code || 'N/A'}`);
      console.error(`   Message: ${error.message}`);
    }
    
    console.error('\n📚 Common Prisma error codes:');
    console.error('   P1001: Can\'t reach database server');
    console.error('   P1017: Server closed connection');
    console.error('   P1000: Authentication failed');
    console.error('   P1003: Database does not exist');
    console.error('   P2021: Table does not exist');
    console.error('   P2025: Record not found');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

