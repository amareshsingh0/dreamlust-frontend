#!/usr/bin/env bun
/**
 * Test Creators Endpoint
 * 
 * Tests the /api/creators endpoint and shows the actual error response
 * 
 * Usage: bun run scripts/test-creators-endpoint.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

console.log('🧪 Testing /api/creators endpoint...\n');
console.log(`📍 API URL: ${API_URL}\n`);

try {
  const response = await fetch(`${API_URL}/api/creators?page=1&limit=20`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log(`📝 Response:`, JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Error Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.log(`\n🔴 Error Code: ${data.error.code || 'N/A'}`);
      console.log(`🔴 Error Message: ${data.error.message || 'N/A'}`);
    }
  }
} catch (error: any) {
  console.error('❌ Failed to connect to server:');
  console.error(`   ${error.message}\n`);
  console.error('💡 Make sure the server is running:');
  console.error('   bun run dev');
  process.exit(1);
}

