import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const searchErrorRate = new Rate('search_errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    search_errors: ['rate<0.01'],     // Less than 1% search errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

export default function () {
  // Search queries to test
  const searchQueries = [
    'tutorial',
    'coding',
    'nature',
    'documentary',
    'music',
    'gaming',
    'cooking',
    'travel',
  ];

  // Random search query
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  // Perform search
  const searchPayload = JSON.stringify({
    query: query,
    page: 1,
    limit: 20,
    sort: 'trending',
  });

  const searchParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const searchResponse = http.post(
    `${API_URL}/search`,
    searchPayload,
    searchParams
  );

  const searchSuccess = check(searchResponse, {
    'search returned 200': (r) => r.status === 200,
    'search response time OK': (r) => r.timings.duration < 500,
    'search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data?.results);
      } catch (e) {
        return false;
      }
    },
  });

  searchErrorRate.add(!searchSuccess);

  // Get trending content
  const trendingResponse = http.get(`${API_URL}/recommendations/trending-now`);

  check(trendingResponse, {
    'trending returned 200': (r) => r.status === 200,
    'trending response time OK': (r) => r.timings.duration < 500,
    'trending has content': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });

  // Simulate user think time
  sleep(1);
}


