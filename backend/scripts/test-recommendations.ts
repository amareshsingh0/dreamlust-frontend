#!/usr/bin/env bun
/**
 * Test Recommendations Endpoints
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

const endpoints = [
  '/api/recommendations/followed-creators?limit=8',
  '/api/recommendations/trending-now?limit=8',
  '/api/recommendations/regional?limit=8',
  '/api/recommendations/continue-watching?limit=8',
];

console.log('🧪 Testing recommendations endpoints...\n');

for (const endpoint of endpoints) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${endpoint}`);
    } else {
      console.log(`❌ ${endpoint}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.log(`❌ ${endpoint}`);
    console.log(`   Error: ${error.message}`);
  }
}

