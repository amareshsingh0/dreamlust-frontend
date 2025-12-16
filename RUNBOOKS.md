# Incident Response Runbooks

This document contains runbooks for common incidents and alerts.

## 🚨 Critical Alerts

### High Error Rate

**Alert**: `error_rate`  
**Severity**: Critical  
**Threshold**: Error rate > 5% over 5 minutes

#### Symptoms
- High number of 5xx errors in logs
- Users reporting errors
- Error rate metric showing > 5%

#### Immediate Actions
1. Check application logs for error patterns
2. Review recent deployments
3. Check database connection status
4. Verify external service dependencies (S3, Redis, etc.)

#### Investigation Steps
1. **Check Error Logs**
   ```bash
   tail -f logs/error.log | grep -i error
   ```

2. **Check Health Endpoints**
   ```bash
   curl http://localhost:3001/health/ready
   ```

3. **Check Database**
   ```bash
   # Check connection pool usage
   curl http://localhost:3001/health/detailed | jq '.checks.database'
   ```

4. **Check Recent Deployments**
   - Review deployment logs
   - Check for configuration changes
   - Review code changes in last deployment

#### Resolution Steps
1. **If Database Issue**
   - Check database connection pool
   - Verify database is running
   - Check for long-running queries
   - Consider scaling database connections

2. **If External Service Issue**
   - Check S3/Redis connection status
   - Verify credentials are valid
   - Check service provider status page

3. **If Code Issue**
   - Review recent code changes
   - Check for null pointer exceptions
   - Review error stack traces
   - Consider rolling back deployment

#### Prevention
- Set up error rate alerts at 2% (warning level)
- Monitor error patterns in staging
- Implement circuit breakers for external services
- Add retry logic with exponential backoff

---

### High P99 Response Time

**Alert**: `response_time_p99`  
**Severity**: Critical  
**Threshold**: P99 response time > 2 seconds over 5 minutes

#### Symptoms
- Slow API responses
- Users reporting timeouts
- High response time metrics

#### Immediate Actions
1. Check database query performance
2. Review slow query logs
3. Check for resource constraints (CPU, memory)
4. Verify external service response times

#### Investigation Steps
1. **Check Database Queries**
   ```sql
   -- Find slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Check System Resources**
   ```bash
   # CPU usage
   top
   
   # Memory usage
   free -h
   
   # Disk I/O
   iostat -x 1
   ```

3. **Check Application Metrics**
   - Review Datadog APM traces
   - Check for slow endpoints
   - Review database connection pool usage

#### Resolution Steps
1. **If Database Issue**
   - Optimize slow queries
   - Add database indexes
   - Consider query caching
   - Scale database if needed

2. **If Resource Constraint**
   - Scale application instances
   - Increase CPU/memory allocation
   - Check for memory leaks

3. **If External Service Issue**
   - Check external service status
   - Implement caching
   - Add timeout configurations
   - Consider fallback mechanisms

#### Prevention
- Set up P95 response time alerts (warning level)
- Regular database query optimization
- Implement caching strategies
- Monitor resource usage trends

---

### Health Check Failure

**Alert**: `health_check_failure`  
**Severity**: Critical  
**Threshold**: Health check returns unhealthy

#### Symptoms
- `/health/ready` endpoint returns 503
- Load balancer marking instances as unhealthy
- Service unavailable errors

#### Immediate Actions
1. Check health endpoint directly
2. Review health check logs
3. Check all service dependencies
4. Verify service is running

#### Investigation Steps
1. **Check Health Endpoint**
   ```bash
   curl http://localhost:3001/health/ready
   curl http://localhost:3001/health/detailed
   ```

2. **Check Service Status**
   ```bash
   # Check if service is running
   ps aux | grep node
   
   # Check service logs
   tail -f logs/combined.log
   ```

3. **Check Dependencies**
   - Database connection
   - Redis connection
   - S3 connection
   - External APIs

#### Resolution Steps
1. **If Database Unhealthy**
   - Check database connection
   - Verify credentials
   - Check connection pool limits
   - Restart database if needed

2. **If Service Not Running**
   - Restart service
   - Check for crashes
   - Review error logs
   - Check resource limits

3. **If Dependency Issue**
   - Check external service status
   - Verify network connectivity
   - Check firewall rules
   - Verify credentials

#### Prevention
- Set up health check monitoring
- Implement automatic recovery
- Regular dependency health checks
- Monitor service uptime

---

## ⚠️ Warning Alerts

### High Database Connection Pool Usage

**Alert**: `database_connections`  
**Severity**: Warning  
**Threshold**: Connection pool usage > 80%

#### Symptoms
- Database connection pool near capacity
- Slow database queries
- Connection timeout errors

#### Investigation Steps
1. **Check Connection Pool**
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check connection pool usage
   SELECT * FROM pg_stat_database;
   ```

2. **Check for Connection Leaks**
   - Review application code
   - Check for unclosed connections
   - Review connection pool configuration

#### Resolution Steps
1. **Increase Pool Size**
   - Update connection pool configuration
   - Restart application
   - Monitor pool usage

2. **Fix Connection Leaks**
   - Review code for unclosed connections
   - Implement connection pooling best practices
   - Add connection timeout

3. **Optimize Queries**
   - Reduce query execution time
   - Add database indexes
   - Implement query caching

#### Prevention
- Monitor connection pool usage
- Set up alerts at 70% usage
- Regular code reviews for connection leaks
- Implement connection pool monitoring

---

### High Disk Usage

**Alert**: `disk_usage`  
**Severity**: Critical  
**Threshold**: Disk usage > 85%

#### Symptoms
- Disk space warnings
- Application errors related to disk I/O
- Slow file operations

#### Investigation Steps
1. **Check Disk Usage**
   ```bash
   df -h
   du -sh /var/log/*
   ```

2. **Find Large Files**
   ```bash
   find /var/log -type f -size +100M
   ```

3. **Check Log Files**
   - Review log file sizes
   - Check for log rotation
   - Review log retention policies

#### Resolution Steps
1. **Clean Up Logs**
   ```bash
   # Rotate logs
   logrotate -f /etc/logrotate.d/dreamlust
   
   # Remove old logs
   find /var/log -name "*.log.*" -mtime +30 -delete
   ```

2. **Increase Disk Space**
   - Add additional disk
   - Resize existing disk
   - Move logs to external storage

3. **Implement Log Rotation**
   - Configure log rotation
   - Set up log retention policies
   - Implement log archiving

#### Prevention
- Set up disk usage alerts at 75%
- Implement automatic log rotation
- Regular log cleanup
- Monitor disk usage trends

---

### Slow Database Queries

**Alert**: `database_query_time`  
**Severity**: Warning  
**Threshold**: P95 query time > 5 seconds

#### Symptoms
- Slow API responses
- Database query timeouts
- High database CPU usage

#### Investigation Steps
1. **Find Slow Queries**
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE mean_exec_time > 5000
   ORDER BY mean_exec_time DESC;
   ```

2. **Check Query Plans**
   ```sql
   EXPLAIN ANALYZE <slow_query>;
   ```

3. **Check Indexes**
   ```sql
   -- Check missing indexes
   SELECT * FROM pg_stat_user_indexes
   WHERE idx_scan = 0;
   ```

#### Resolution Steps
1. **Add Indexes**
   - Identify missing indexes
   - Create appropriate indexes
   - Monitor query performance

2. **Optimize Queries**
   - Rewrite inefficient queries
   - Use query hints
   - Implement query caching

3. **Scale Database**
   - Increase database resources
   - Consider read replicas
   - Implement connection pooling

#### Prevention
- Regular query performance reviews
- Set up slow query logging
- Monitor query execution times
- Implement query optimization guidelines

---

## 🔧 Additional Common Issues

### High Error Rate Alert

**Alert**: `error_rate`  
**Severity**: Critical  
**Threshold**: Error rate > 5% over 5 minutes

#### Symptoms
- High number of 5xx errors in logs
- Users reporting errors
- Error rate metric showing > 5%
- Sentry showing spike in errors

#### Immediate Actions
1. **Check Sentry for Recent Errors**
   - Open Sentry dashboard
   - Review error trends
   - Identify most common errors
   - Check error frequency and patterns

2. **Review Recent Deployments**
   - Check deployment history
   - Review code changes in last deployment
   - Check for configuration changes
   - **Rollback if needed** (if error spike correlates with deployment)

3. **Check Database Connection Pool**
   ```bash
   # Check connection pool usage
   curl http://localhost:3001/health/detailed | jq '.checks.database'
   
   # Check active connections
   psql -c "SELECT count(*) FROM pg_stat_activity;"
   ```

4. **Verify External Service Status**
   - Check Stripe status page
   - Check Mux status page
   - Check S3/Cloudflare R2 status
   - Check Redis status
   - Verify API keys are valid

5. **Scale Up if Traffic Spike**
   - Check traffic metrics
   - Compare with normal traffic patterns
   - Scale application instances if needed
   - Scale database if needed

6. **Post in #incidents Slack Channel**
   - Create incident thread
   - Share error logs
   - Update team on status
   - Document timeline

#### Investigation Steps
1. **Analyze Error Patterns**
   ```bash
   # Check error logs
   tail -f logs/error.log | grep -i error
   
   # Count errors by type
   grep -i error logs/error.log | awk '{print $NF}' | sort | uniq -c | sort -rn
   ```

2. **Check Application Metrics**
   - Review Datadog APM traces
   - Check for slow endpoints
   - Review database query performance
   - Check external API response times

3. **Review Recent Changes**
   - Check Git commits in last 24 hours
   - Review configuration changes
   - Check environment variable changes
   - Review dependency updates

4. **Check System Resources**
   ```bash
   # CPU usage
   top
   
   # Memory usage
   free -h
   
   # Disk I/O
   iostat -x 1
   ```

#### Resolution Steps
1. **If Deployment Issue**
   - Rollback to previous version
   - Verify rollback success
   - Monitor error rates
   - Fix issue in staging before redeploy

2. **If Database Issue**
   - Check connection pool limits
   - Kill long-running queries if safe
   - Increase connection pool if needed
   - Restart database connections

3. **If External Service Issue**
   - Check service provider status
   - Implement fallback mechanisms
   - Add retry logic with exponential backoff
   - Consider alternative providers

4. **If Traffic Spike**
   - Scale application instances
   - Scale database connections
   - Enable rate limiting
   - Implement request queuing

#### Prevention
- Set up error rate alerts at 2% (warning level)
- Monitor error patterns in staging
- Implement circuit breakers for external services
- Add retry logic with exponential backoff
- Regular load testing
- Monitor external service status pages

---

### Database Connection Exhaustion

**Alert**: `database_connections_critical`  
**Severity**: Critical  
**Threshold**: Connection pool usage > 95%

#### Symptoms
- Database connection pool near capacity
- Connection timeout errors
- Slow database queries
- Application errors related to database

#### Immediate Actions
1. **Check Active Connections**
   ```sql
   -- Check total active connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check connections by state
   SELECT state, count(*) 
   FROM pg_stat_activity 
   GROUP BY state;
   
   -- Check connections by database
   SELECT datname, count(*) 
   FROM pg_stat_activity 
   GROUP BY datname;
   ```

2. **Kill Long-Running Queries (if safe)**
   ```sql
   -- Find long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
   AND state = 'active';
   
   -- Kill specific query (use with caution)
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE pid = <query_pid>;
   ```

3. **Increase Connection Pool Temporarily**
   ```env
   # In .env or connection string
   DATABASE_URL="postgresql://...?connection_limit=100&pool_timeout=20"
   ```
   - Restart application
   - Monitor connection usage
   - Revert after investigation

4. **Review Recent Code Changes**
   - Check for connection leaks
   - Review transaction handling
   - Check for unclosed connections
   - Review connection pool configuration

5. **Add Connection Timeout if Missing**
   ```typescript
   // In Prisma configuration
   const poolUrl = databaseUrl.includes('?')
     ? `${databaseUrl}&connection_limit=50&pool_timeout=20&connect_timeout=10`
     : `${databaseUrl}?connection_limit=50&pool_timeout=20&connect_timeout=10`;
   ```

#### Investigation Steps
1. **Identify Connection Leaks**
   ```sql
   -- Check for idle connections
   SELECT pid, state, wait_event_type, wait_event, query_start, state_change
   FROM pg_stat_activity
   WHERE state = 'idle'
   ORDER BY state_change;
   ```

2. **Check Application Code**
   - Review Prisma client usage
   - Check for unclosed transactions
   - Review connection pool configuration
   - Check for connection sharing issues

3. **Review Query Performance**
   ```sql
   -- Find slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

4. **Check for Connection Pooling Issues**
   - Review connection pool size
   - Check for connection pool exhaustion
   - Review connection timeout settings
   - Check for connection pool leaks

#### Resolution Steps
1. **Fix Connection Leaks**
   - Ensure all connections are closed
   - Use connection pooling properly
   - Implement connection timeout
   - Add connection monitoring

2. **Optimize Queries**
   - Fix slow queries
   - Add database indexes
   - Implement query caching
   - Reduce query execution time

3. **Scale Database Connections**
   - Increase connection pool size
   - Scale database instance
   - Use read replicas
   - Implement connection pooling

4. **Implement Connection Management**
   - Add connection timeout
   - Implement connection retry logic
   - Add connection monitoring
   - Implement connection health checks

#### Prevention
- Monitor connection pool usage
- Set up alerts at 70% usage
- Regular code reviews for connection leaks
- Implement connection pool monitoring
- Use connection pooling best practices
- Regular database query optimization
- Implement connection timeout

---

### Video Upload Failures

**Alert**: Custom alert for upload failures  
**Severity**: Warning/Critical (depending on failure rate)  
**Threshold**: Upload failure rate > 10%

#### Symptoms
- Users reporting upload failures
- Upload errors in logs
- Failed upload jobs in queue
- S3 upload errors

#### Immediate Actions
1. **Check S3 Bucket Permissions**
   ```bash
   # Test S3 access
   aws s3 ls s3://your-bucket-name/
   
   # Check bucket policy
   aws s3api get-bucket-policy --bucket your-bucket-name
   
   # Check IAM permissions
   aws iam get-user-policy --user-name your-user --policy-name your-policy
   ```

2. **Verify Transcoding Service Status**
   - Check Mux service status
   - Check Cloudflare Stream status
   - Verify API keys are valid
   - Check transcoding queue

3. **Review Upload Logs for Specific User**
   ```bash
   # Check upload logs
   grep "upload" logs/combined.log | grep "user-id"
   
   # Check error logs
   grep "upload.*error" logs/error.log
   
   # Check specific upload ID
   grep "upload-id" logs/combined.log
   ```

4. **Check Disk Space on Workers**
   ```bash
   # Check disk usage
   df -h
   
   # Check available space
   du -sh /tmp/*
   
   # Check worker disk space
   docker exec worker df -h
   ```

5. **Restart Transcoding Workers if Stuck**
   ```bash
   # If using Docker
   docker-compose restart worker
   
   # If using Kubernetes
   kubectl rollout restart deployment/transcoding-worker
   
   # Check worker status
   docker ps | grep worker
   ```

#### Investigation Steps
1. **Check Upload Queue**
   ```bash
   # Check queue size
   redis-cli LLEN upload-queue
   
   # Check failed jobs
   redis-cli LRANGE failed-uploads 0 -1
   
   # Check processing jobs
   redis-cli LRANGE processing-uploads 0 -1
   ```

2. **Review Upload Process**
   - Check file size limits
   - Check file type restrictions
   - Check upload timeout settings
   - Review upload validation

3. **Check Storage Service**
   ```bash
   # Test S3 upload
   aws s3 cp test-file.mp4 s3://your-bucket/test/
   
   # Check S3 bucket status
   aws s3api head-bucket --bucket your-bucket-name
   
   # Check S3 region
   aws s3api get-bucket-location --bucket your-bucket-name
   ```

4. **Review Transcoding Service**
   - Check transcoding API status
   - Verify API credentials
   - Check transcoding limits
   - Review transcoding queue

5. **Check Network Connectivity**
   ```bash
   # Test S3 connectivity
   curl -I https://s3.amazonaws.com
   
   # Test transcoding service
   curl -I https://api.mux.com
   
   # Check DNS resolution
   nslookup s3.amazonaws.com
   ```

#### Resolution Steps
1. **Fix S3 Permissions**
   - Update bucket policy
   - Fix IAM permissions
   - Regenerate access keys if needed
   - Verify bucket exists and is accessible

2. **Fix Transcoding Issues**
   - Restart transcoding workers
   - Check transcoding service status
   - Verify API credentials
   - Clear stuck transcoding jobs

3. **Fix Disk Space Issues**
   ```bash
   # Clean up temporary files
   find /tmp -type f -mtime +1 -delete
   
   # Clean up old uploads
   find /uploads -type f -mtime +7 -delete
   
   # Increase disk space if needed
   ```

4. **Fix Upload Process**
   - Increase upload timeout
   - Fix file size limits
   - Fix file type validation
   - Improve error handling

5. **Retry Failed Uploads**
   ```bash
   # Retry failed uploads from queue
   # Implement retry logic in upload service
   ```

#### Prevention
- Monitor upload success rate
- Set up alerts for upload failures
- Regular S3 bucket health checks
- Monitor transcoding service status
- Implement upload retry logic
- Regular disk space monitoring
- Implement upload validation
- Regular worker health checks
- Monitor upload queue size
- Implement upload timeout handling

---

## 📋 Escalation Policy

### Level 1: On-Call Engineer
- **Response Time**: 15 minutes
- **Actions**: Acknowledge alert, initial investigation
- **Tools**: Logs, monitoring dashboards, runbooks

### Level 2: Senior Engineer
- **Escalation**: If issue not resolved in 30 minutes
- **Actions**: Deep investigation, code review, deployment rollback
- **Tools**: Full access to systems, deployment tools

### Level 3: Engineering Manager
- **Escalation**: If issue not resolved in 1 hour
- **Actions**: Coordinate team, make critical decisions
- **Tools**: All tools, authority to make changes

### Level 4: CTO/VP Engineering
- **Escalation**: If issue not resolved in 2 hours or critical business impact
- **Actions**: Strategic decisions, external communication
- **Tools**: Full authority

---

## 🔧 On-Call Setup

### PagerDuty Configuration

1. **Create Service**
   - Service name: "Dreamlust API"
   - Integration type: "Events API v2"
   - Copy integration key to `PAGERDUTY_INTEGRATION_KEY`

2. **Set Up Escalation Policy**
   - Level 1: Primary on-call (15 min)
   - Level 2: Secondary on-call (30 min)
   - Level 3: Engineering Manager (1 hour)
   - Level 4: CTO (2 hours)

3. **Configure Schedules**
   - Primary on-call: Weekdays 9 AM - 6 PM
   - Secondary on-call: Evenings and weekends
   - Rotation: Weekly

### Opsgenie Configuration

1. **Create Team**
   - Team name: "Dreamlust Engineering"
   - Add team members

2. **Set Up Escalation Rules**
   - Similar to PagerDuty escalation policy
   - Configure notification rules

3. **Configure Schedules**
   - Set up on-call schedules
   - Configure rotation

### Slack Integration

1. **Create Webhook**
   - Go to Slack Apps → Incoming Webhooks
   - Create webhook for #alerts channel
   - Copy webhook URL to `SLACK_WEBHOOK_URL`

2. **Configure Channels**
   - #alerts: All alerts
   - #critical-alerts: Critical alerts only
   - #incidents: Active incidents

---

## 📊 Monitoring Dashboard

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 1%
   - Warning: > 2%
   - Critical: > 5%

2. **Response Time**
   - P95: < 500ms
   - P99: < 1s
   - Critical: P99 > 2s

3. **Database**
   - Connection pool: < 70%
   - Query time: P95 < 1s
   - Active connections: < 80% of pool

4. **System Resources**
   - CPU: < 70%
   - Memory: < 80%
   - Disk: < 75%

5. **Queue**
   - Queue size: < 1000
   - Processing time: P95 < 1m
   - Failed jobs: < 1%

---

## 🚀 Post-Incident Actions

### Incident Review Process

1. **Immediate (Within 24 hours)**
   - Document incident timeline
   - Identify root cause
   - Document resolution steps

2. **Follow-up (Within 1 week)**
   - Conduct post-mortem meeting
   - Create action items
   - Update runbooks

3. **Prevention (Within 1 month)**
   - Implement preventive measures
   - Update monitoring
   - Improve alerting

### Incident Report Template

```markdown
# Incident Report: [Title]

## Summary
Brief description of the incident

## Timeline
- [Time] - Alert triggered
- [Time] - Investigation started
- [Time] - Root cause identified
- [Time] - Resolution implemented
- [Time] - Incident resolved

## Root Cause
Detailed explanation of root cause

## Impact
- Users affected: [number]
- Duration: [time]
- Services affected: [list]

## Resolution
Steps taken to resolve the incident

## Action Items
- [ ] Action item 1
- [ ] Action item 2

## Prevention
Measures to prevent recurrence
```

---

## 📚 Additional Resources

- [PagerDuty Documentation](https://developer.pagerduty.com/)
- [Opsgenie Documentation](https://docs.opsgenie.com/)
- [Slack API Documentation](https://api.slack.com/)
- [Incident Response Best Practices](https://www.atlassian.com/incident-management/handbook)

