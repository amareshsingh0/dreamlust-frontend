# Load Testing with k6

This directory contains load tests using [k6](https://k6.io/) to test API performance under various load conditions.

## Installation

k6 is installed separately (not via npm/bun). Install it based on your OS:

### Windows

```powershell
# Using Chocolatey
choco install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

### macOS

```bash
brew install k6
```

### Linux

```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9B
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Or use the binary release
# https://k6.io/docs/getting-started/installation/
```

## Running Tests

### Search Load Test

Tests search and trending endpoints with 100 concurrent users:

```bash
# Set API URL (optional, defaults to http://localhost:3001)
export API_URL=http://localhost:3001

# Run search load test
k6 run tests/load/search-load.js

# Run with custom API URL
k6 run -e API_URL=http://your-api-url.com tests/load/search-load.js
```

### API Load Test

Tests multiple endpoints simultaneously:

```bash
k6 run tests/load/api-load.js
```

### Auth Load Test

Tests registration and login endpoints:

```bash
k6 run tests/load/auth-load.js
```

## Test Scenarios

### Search Load Test (`search-load.js`)

- **Stages**: Ramp up to 100 users over 2 minutes, maintain for 5 minutes, ramp down over 2 minutes
- **Endpoints Tested**:
  - `POST /api/search` - Search functionality
  - `GET /api/recommendations/trending-now` - Trending content
- **Thresholds**:
  - 95% of requests under 500ms
  - Less than 1% error rate

### API Load Test (`api-load.js`)

- **Stages**: Gradual ramp from 50 to 100 users
- **Endpoints Tested**:
  - `GET /api/recommendations/trending-now`
  - `GET /api/creators`
  - `POST /api/search`
- **Thresholds**:
  - 95% of requests under 500ms
  - 99% of requests under 1s
  - Less than 1% error rate

### Auth Load Test (`auth-load.js`)

- **Stages**: Ramp up to 20 users (auth is more resource-intensive)
- **Endpoints Tested**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
- **Thresholds**:
  - 95% of requests under 1s
  - Less than 5% error rate (auth can have more failures)

## Customization

### Environment Variables

Set the API URL:

```bash
export API_URL=http://localhost:3001
k6 run tests/load/search-load.js
```

Or pass it inline:

```bash
k6 run -e API_URL=http://localhost:3001 tests/load/search-load.js
```

### Modifying Load Patterns

Edit the `stages` in each test file:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Maintain
    { duration: '2m', target: 0 },   // Ramp down
  ],
};
```

### Adjusting Thresholds

Modify the `thresholds` section:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'], // 95th percentile under 500ms
  http_req_failed: ['rate<0.01'],   // Less than 1% failures
},
```

## Output and Results

k6 provides detailed metrics:

- **http_req_duration**: Request duration statistics
- **http_req_failed**: Failed request rate
- **http_reqs**: Total requests per second
- **vus**: Virtual users (concurrent users)
- **Custom metrics**: Defined in each test file

### Viewing Results

k6 outputs results to the console. For more detailed analysis:

```bash
# Output to JSON
k6 run --out json=results.json tests/load/search-load.js

# Output to InfluxDB (if configured)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/search-load.js

# Output to Cloud (k6 Cloud)
k6 cloud tests/load/search-load.js
```

## Best Practices

1. **Start Small**: Begin with low user counts and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and database during tests
3. **Test Realistic Scenarios**: Use realistic data and user behavior patterns
4. **Run During Off-Peak**: Avoid impacting production users
5. **Set Appropriate Thresholds**: Adjust based on your SLA requirements
6. **Use Custom Metrics**: Track business-specific metrics (e.g., search success rate)

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Load Tests
  run: |
    k6 run tests/load/api-load.js
  env:
    API_URL: ${{ secrets.API_URL }}
```

## Troubleshooting

### Tests Failing

- Check if API server is running
- Verify API_URL is correct
- Check rate limiting settings
- Monitor server resources (CPU, memory, database)

### High Error Rates

- Increase server resources
- Check database connection pool
- Review rate limiting configuration
- Check for memory leaks

### Slow Response Times

- Optimize database queries
- Add caching layers
- Scale horizontally
- Review API endpoint performance

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Options](https://k6.io/docs/using-k6/options/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)


