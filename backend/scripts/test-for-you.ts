#!/usr/bin/env bun

const API_URL = process.env.API_URL || 'http://localhost:3001';

try {
  const response = await fetch(`${API_URL}/api/recommendations/for-you?limit=8`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Error:', JSON.stringify(data, null, 2));
  }
} catch (error: any) {
  console.log('❌ Failed:', error.message);
}

