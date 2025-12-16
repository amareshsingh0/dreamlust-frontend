import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiErrorRate = new Rate('api_errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],                 // Less than 1% errors
    api_errors: ['rate<0.01'],                       // Less than 1% API errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

export default function () {
  // Batch requests to simulate real user behavior
  const responses = http.batch([
    ['GET', `${API_URL}/recommendations/trending-now`],
    ['GET', `${API_URL}/creators?status=APPROVED&limit=20`],
    ['POST', `${API_URL}/search`, JSON.stringify({
      query: 'tutorial',
      page: 1,
      limit: 20,
    }), {
      headers: { 'Content-Type': 'application/json' },
    }],
  ]);

  // Check trending endpoint
  const trendingCheck = check(responses[0], {
    'trending returned 200': (r) => r.status === 200,
    'trending response time OK': (r) => r.timings.duration < 500,
    'trending has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });

  apiResponseTime.add(responses[0].timings.duration);
  apiErrorRate.add(!trendingCheck);

  // Check creators endpoint
  const creatorsCheck = check(responses[1], {
    'creators returned 200': (r) => r.status === 200,
    'creators response time OK': (r) => r.timings.duration < 500,
    'creators has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });

  apiResponseTime.add(responses[1].timings.duration);
  apiErrorRate.add(!creatorsCheck);

  // Check search endpoint
  const searchCheck = check(responses[2], {
    'search returned 200': (r) => r.status === 200,
    'search response time OK': (r) => r.timings.duration < 500,
    'search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });

  apiResponseTime.add(responses[2].timings.duration);
  apiErrorRate.add(!searchCheck);

  // Simulate user think time
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}


