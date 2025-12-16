# Health Check Endpoints

Comprehensive health check endpoints for monitoring and load balancer integration.

## 📋 Overview

The health check system provides multiple endpoints for different monitoring scenarios:

- **`GET /health`** - Basic health check (fast, no external dependencies)
- **`GET /health/ready`** - Readiness probe (checks critical dependencies)
- **`GET /health/live`** - Liveness probe (checks if service is running)
- **`GET /health/detailed`** - Detailed health check with all services

## 🚀 Endpoints

### GET /health

Basic health check endpoint. Returns immediately without checking external services.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production"
}
```

**Use Cases:**
- Quick availability check
- Load balancer health checks (fast response)
- Basic monitoring

### GET /health/ready

Readiness probe that checks if the service is ready to accept traffic. Verifies all critical dependencies.

**Response (200 OK - All healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    },
    "s3": {
      "status": "not_configured"
    },
    "supabase": {
      "status": "healthy",
      "responseTime": 10
    }
  }
}
```

**Response (503 Service Unavailable - Critical service down):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "unhealthy",
      "responseTime": 5000,
      "error": "Connection timeout"
    }
  }
}
```

**Response (200 OK - Degraded):**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "unhealthy",
      "responseTime": 5000,
      "error": "Connection refused"
    }
  }
}
```

**Status Codes:**
- `200` - Healthy or degraded (service can accept traffic)
- `503` - Unhealthy (critical service down)

**Use Cases:**
- Kubernetes readiness probe
- Load balancer readiness checks
- Deployment verification

### GET /health/live

Liveness probe that checks if the service is alive and responding.

**Response (200 OK):**
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

**Use Cases:**
- Kubernetes liveness probe
- Process monitoring
- Restart detection

### GET /health/detailed

Comprehensive health check with all services checked in parallel.

**Response:**
Same format as `/health/ready`, but all checks run in parallel for faster response.

**Use Cases:**
- Monitoring dashboards
- Detailed diagnostics
- Performance monitoring

## 🔍 Health Check Details

### Database Check

Checks PostgreSQL connection via Prisma.

- **Critical**: Yes
- **Method**: `SELECT 1` query
- **Timeout**: None (uses Prisma timeout)
- **Status**: `healthy` | `unhealthy`

### Redis Check

Checks Redis connection if configured.

- **Critical**: No (optional service)
- **Method**: `PING` command
- **Timeout**: 5 seconds
- **Status**: `healthy` | `unhealthy` | `not_configured`

### S3 Check

Checks S3/Cloudflare R2 connection if configured.

- **Critical**: No (optional service)
- **Method**: `HeadBucket` command
- **Timeout**: 10 seconds
- **Status**: `healthy` | `unhealthy` | `not_configured`

**Configuration Required:**
- `S3_BUCKET_NAME`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

### Supabase Check

Checks Supabase connection if configured.

- **Critical**: No (optional service)
- **Method**: Connection test query
- **Timeout**: 10 seconds
- **Status**: `healthy` | `unhealthy` | `not_configured`

**Configuration Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📊 Status Meanings

### Overall Status

- **`healthy`**: All critical services are healthy
- **`degraded`**: Critical services healthy, but optional services are down
- **`unhealthy`**: One or more critical services are down

### Individual Check Status

- **`healthy`**: Service is responding correctly
- **`unhealthy`**: Service is not responding or error occurred
- **`not_configured`**: Service is not configured (not an error)

## 🔧 Configuration

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/db

# Optional
REDIS_URL=redis://localhost:6379
S3_BUCKET_NAME=my-bucket
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

## 🚦 Load Balancer Integration

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

### AWS ALB

```json
{
  "HealthCheckPath": "/health/ready",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3
}
```

### Nginx

```nginx
upstream backend {
    server backend1:3001;
    server backend2:3001;
}

server {
    location /health {
        proxy_pass http://backend;
        health_check uri=/health/ready;
    }
}
```

## 📈 Monitoring

### Prometheus Metrics

Health checks can be integrated with Prometheus:

```typescript
// Example: Track health check results
const healthCheckDuration = new prometheus.Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health checks',
  labelNames: ['check', 'status'],
});
```

### Datadog Integration

Health checks are automatically tracked by Datadog APM if configured.

### Custom Monitoring

You can set up monitoring to alert when:
- `/health/ready` returns 503
- Response time exceeds threshold
- Any check status is `unhealthy`

## 🔒 Security

Health check endpoints are:
- ✅ Public (no authentication required)
- ✅ Rate limited (via IP rate limiter)
- ✅ Logged (via request logger)
- ✅ Safe (no sensitive data exposed)

## 🐛 Troubleshooting

### Database Check Fails

1. Check `DATABASE_URL` is correct
2. Verify database is running
3. Check network connectivity
4. Review database logs

### Redis Check Fails

1. Check `REDIS_URL` is correct
2. Verify Redis is running
3. Check Redis connection limits
4. Review Redis logs

### S3 Check Fails

1. Verify S3 credentials are correct
2. Check bucket exists and is accessible
3. Verify network connectivity
4. Check IAM permissions

## 📚 Additional Resources

- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [AWS ALB Health Checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [Prometheus Health Checks](https://prometheus.io/docs/guides/monitoring/)


