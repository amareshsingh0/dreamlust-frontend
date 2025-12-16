import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const authErrorRate = new Rate('auth_errors');
const loginSuccess = new Counter('login_success');
const registerSuccess = new Counter('register_success');

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 20 },  // Stay at 20 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s (auth is slower)
    http_req_failed: ['rate<0.05'],    // Less than 5% errors (auth can have more failures)
    auth_errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// Generate random email for testing
function generateEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test_${timestamp}_${random}@loadtest.example.com`;
}

export default function () {
  // Simulate user registration
  const email = generateEmail();
  const username = `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const password = 'TestPassword123!';

  const registerPayload = JSON.stringify({
    email,
    username,
    password,
    displayName: `Test User ${Math.floor(Math.random() * 1000)}`,
  });

  const registerResponse = http.post(
    `${API_URL}/auth/register`,
    registerPayload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const registerCheck = check(registerResponse, {
    'register returned 201': (r) => r.status === 201,
    'register response time OK': (r) => r.timings.duration < 1000,
    'register has tokens': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data?.tokens?.accessToken;
      } catch (e) {
        return false;
      }
    },
  });

  if (registerCheck) {
    registerSuccess.add(1);
  }
  authErrorRate.add(!registerCheck);

  // Simulate user login (with a known test account if available)
  // In real load tests, you'd use pre-created test accounts
  const loginPayload = JSON.stringify({
    email: email, // Use the email we just registered
    password: password,
    rememberMe: false,
  });

  const loginResponse = http.post(
    `${API_URL}/auth/login`,
    loginPayload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const loginCheck = check(loginResponse, {
    'login returned 200': (r) => r.status === 200,
    'login response time OK': (r) => r.timings.duration < 1000,
    'login has tokens': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data?.tokens?.accessToken;
      } catch (e) {
        return false;
      }
    },
  });

  if (loginCheck) {
    loginSuccess.add(1);
  }
  authErrorRate.add(!loginCheck);

  // Simulate user think time
  sleep(2);
}


