# Incident Response Runbooks

This document contains runbooks for common incidents and alerts.

## Table of Contents

1. [High Error Rate Alert](#high-error-rate-alert)
2. [High Response Time](#high-response-time)
3. [Database Connection Exhaustion](#database-connection-exhaustion)
4. [Video Upload Failures](#video-upload-failures)
5. [High Disk Usage](#high-disk-usage)
6. [High Memory Usage](#high-memory-usage)
7. [Health Check Failure](#health-check-failure)
8. [Redis Connection Failure](#redis-connection-failure)
9. [Queue Processing Delays](#queue-processing-delays)

---

## High Error Rate Alert

**Alert:** `error_rate` - Error rate exceeds 5% over 5 minutes

### Symptoms
- High number of 5xx errors in logs
- Users reporting failures
- Error rate metric > 5%

### Immediate Actions

1. **Check Sentry for Recent Errors**
   ```bash
   # Visit Sentry dashboard
   # https://sentry.io/organizations/[your-org]/issues/
   
   # Filter by:
   # - Last 1 hour
   # - Status: Unresolved
   # - Sort by: Events (most frequent first)
   ```

2. **Review Recent Deployments**
   ```bash
   # Check deployment history
   # - GitHub Actions: https://github.com/[repo]/actions
   # - Check if deployment just completed
   # - Review recent commits
   
   # If deployment is the cause, rollback:
   git revert [commit-hash]
   # Or redeploy previous version
   ```

3. **Check Database Connection Pool**
   ```bash
   # Check active connections
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
   
   # Check connection pool usage
   curl http://localhost:3001/api/health
   # Look for database_connection_pool_usage in response
   ```

4. **Verify External Service Status**
   ```bash
   # Check Stripe status
   # Visit: https://status.stripe.com/
   
   # Check Mux status
   # Visit: https://status.mux.com/
   
   # Check S3/R2 status
   # Visit: https://status.cloudflare.com/ (for R2)
   # Or: https://status.aws.amazon.com/ (for S3)
   ```

5. **Scale Up if Traffic Spike**
   ```bash
   # If using a platform like Railway, Render, or AWS:
   # - Increase instance count
   # - Scale up instance size
   # - Enable auto-scaling if available
   
   # Check current traffic
   # - Review metrics in monitoring dashboard
   # - Check if traffic spike is legitimate or attack
   ```

6. **Post in #incidents Discord Channel**
   ```bash
   # Notify team immediately in Discord #incidents channel:
   # - Alert severity and impact
   # - Current investigation status
   # - Estimated time to resolution
   # - Request help if needed
   # - Mention @on-call-primary for critical alerts
   ```

### Investigation Steps

1. **Identify Error Pattern in Sentry**
   - Check most frequent errors
   - Look for stack traces
   - Identify affected endpoints
   - Check if specific users/regions affected

2. **Check Application Logs**
   ```bash
   # Check recent errors
   tail -f logs/error.log | grep "5xx\|ERROR"
   
   # Check combined logs
   tail -f logs/combined.log | grep -i error
   ```

3. **Check System Resources**
   ```bash
   # CPU usage
   top
   
   # Memory usage
   free -h
   
   # Disk I/O
   iostat -x 1
   ```

4. **Check Dependencies**
   - Database connection pool (see above)
   - Redis connection: `redis-cli -u $REDIS_URL ping`
   - External API status (Stripe, Mux, S3/R2)

### Resolution

- **If code issue:** Rollback deployment immediately
- **If resource exhaustion:** Scale up resources
- **If dependency failure:** Check dependency status, implement fallbacks
- **If database issue:** Check connection pool, optimize queries
- **If traffic spike:** Scale horizontally, enable rate limiting

### Prevention

- Set up error rate alerts at 2% (warning) and 5% (critical)
- Monitor error trends in Sentry
- Implement circuit breakers for external dependencies (Stripe, Mux)
- Regular load testing
- Set up canary deployments

---

## High Response Time

**Alert:** `response_time_p95` - P95 response time exceeds 1 second over 5 minutes

### Symptoms
- Slow API responses
- Users reporting lag
- P95 response time > 1000ms

### Immediate Actions

1. **Check Current Response Times**
   ```bash
   # Check metrics endpoint (if available)
   curl http://localhost:3001/api/metrics
   ```

2. **Check Database Query Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

3. **Check System Resources**
   - CPU usage
   - Memory usage
   - Disk I/O

### Investigation Steps

1. **Identify Slow Endpoints**
   - Check request logs for slow requests
   - Identify which endpoints are slow
   - Check if specific queries are slow

2. **Check Database Performance**
   - Check connection pool usage
   - Look for long-running queries
   - Check for missing indexes

3. **Check External Dependencies**
   - API response times
   - Network latency
   - Third-party service status

### Resolution

- **If database slow:** Optimize queries, add indexes, check connection pool
- **If CPU bound:** Scale horizontally, optimize code
- **If memory bound:** Increase memory, optimize memory usage
- **If external API slow:** Implement caching, add timeouts, use fallbacks

### Prevention

- Set up response time alerts
- Regular performance testing
- Database query optimization
- Implement caching where appropriate
- Monitor slow query logs

---

## Database Connection Exhaustion

**Alert:** `database_connections` - Connection pool usage exceeds 80%

### Symptoms
- Database connection errors
- Slow queries
- Connection pool usage > 80%
- "Too many connections" errors

### Immediate Actions

1. **Check Active Connections**
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
   ```

2. **Kill Long-Running Queries if Safe**
   ```sql
   -- First, identify long-running queries
   SELECT 
     pid,
     now() - pg_stat_activity.query_start AS duration,
     state,
     query
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
   AND state = 'active'
   AND datname = current_database();
   
   -- Kill specific query (replace PID)
   -- ⚠️ WARNING: Only kill if safe to do so
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE pid = [PID_HERE]
   AND datname = current_database();
   ```

3. **Increase Connection Pool Temporarily**
   ```bash
   # Update DATABASE_URL to increase connection_limit
   # Current format: postgresql://user:pass@host:port/db?connection_limit=50
   # Increase to: connection_limit=100 (temporary fix)
   
   # Update .env file:
   DATABASE_URL="postgresql://...?connection_limit=100&pool_timeout=20"
   
   # Restart application
   # Note: This is a temporary fix - investigate root cause
   ```

4. **Review Recent Code Changes for Connection Leaks**
   ```bash
   # Check recent commits that might have connection issues
   git log --since="24 hours ago" --oneline
   
   # Look for:
   # - Database queries without proper cleanup
   # - Missing await on database operations
   # - Transactions not being committed/rolled back
   # - Prisma client not being properly closed
   ```

5. **Add Connection Timeout if Missing**
   ```typescript
   // In backend/src/lib/prisma.ts
   // Ensure connection timeout is set:
   const poolUrl = databaseUrl.includes('?')
     ? `${databaseUrl}&connection_limit=50&pool_timeout=20&connect_timeout=10`
     : `${databaseUrl}?connection_limit=50&pool_timeout=20&connect_timeout=10`;
   ```

### Investigation Steps

1. **Identify Connection Leaks**
   ```sql
   -- Check for idle connections
   SELECT count(*), state 
   FROM pg_stat_activity 
   WHERE datname = current_database()
   GROUP BY state;
   
   -- Check for connections waiting on locks
   SELECT count(*) 
   FROM pg_stat_activity 
   WHERE wait_event_type = 'Lock'
   AND datname = current_database();
   ```

2. **Check Query Performance**
   ```sql
   -- Check slow queries
   SELECT 
     query,
     calls,
     mean_exec_time,
     max_exec_time,
     total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Check Application Load**
   ```bash
   # Check request rate
   # Review monitoring dashboard
   # Check if traffic spike occurred
   
   # Check concurrent users
   # Review analytics or logs
   ```

4. **Check for Transaction Issues**
   ```sql
   -- Check for long-running transactions
   SELECT 
     pid,
     now() - xact_start AS transaction_duration,
     state,
     query
   FROM pg_stat_activity
   WHERE xact_start IS NOT NULL
   AND (now() - xact_start) > interval '1 minute'
   AND datname = current_database();
   ```

### Resolution

- **If connection leak:** Fix code to properly close connections, add try/finally blocks
- **If pool too small:** Increase connection_limit in DATABASE_URL (permanent fix)
- **If slow queries:** Optimize queries, add indexes, use query optimization
- **If traffic spike:** Scale application horizontally, implement connection pooling
- **If transaction issues:** Fix transaction handling, add timeouts

### Prevention

- Set up connection pool monitoring
- Regular code reviews for connection handling
- Implement connection pool limits (50-100 connections)
- Monitor query performance with pg_stat_statements
- Set up alerts at 80% (warning) and 95% (critical)
- Use Prisma connection pooling properly
- Add connection timeouts
- Review code for proper async/await usage

---

## Video Upload Failures

**Alert:** Video uploads failing or stuck in processing

### Symptoms
- Users reporting upload failures
- Videos stuck in "processing" status
- Upload endpoint returning errors
- Transcoding jobs failing

### Immediate Actions

1. **Check S3 Bucket Permissions**
   ```bash
   # Verify S3/R2 credentials are correct
   # Check environment variables:
   echo $S3_ACCESS_KEY_ID
   echo $S3_SECRET_ACCESS_KEY
   echo $S3_BUCKET_NAME
   # Or for R2:
   echo $R2_ACCESS_KEY_ID
   echo $R2_SECRET_ACCESS_KEY
   echo $R2_BUCKET_NAME
   
   # Test S3 access
   # Use AWS CLI or test via application
   aws s3 ls s3://$S3_BUCKET_NAME --endpoint-url=$S3_ENDPOINT
   
   # Check bucket permissions
   # - Verify bucket exists
   # - Check IAM/user permissions
   # - Verify bucket policy allows uploads
   ```

2. **Verify Transcoding Service Status**
   ```bash
   # Check Mux status
   # Visit: https://status.mux.com/
   
   # Check Mux API connectivity
   curl -X GET "https://api.mux.com/video/v1/assets" \
     -H "Authorization: Bearer $MUX_TOKEN_ID:$MUX_TOKEN_SECRET"
   
   # Check Cloudflare Stream status (if using)
   # Visit: https://status.cloudflare.com/
   
   # Verify transcoding worker is running
   # Check worker logs:
   tail -f logs/combined.log | grep -i "video\|transcode"
   ```

3. **Review Upload Logs for Specific User**
   ```bash
   # Check application logs for upload errors
   tail -f logs/error.log | grep -i "upload\|video"
   
   # Check for specific user's uploads
   # In database:
   SELECT id, title, status, "createdAt", "mediaUrl"
   FROM content
   WHERE "creatorId" = '[USER_ID]'
   AND status IN ('PENDING_REVIEW', 'PROCESSING')
   ORDER BY "createdAt" DESC
   LIMIT 10;
   
   # Check upload route logs
   # Look for errors in: backend/src/routes/upload.ts
   ```

4. **Check Disk Space on Workers**
   ```bash
   # Check disk space on server/worker instances
   df -h
   
   # Check if /tmp is full (where uploads might be temporarily stored)
   du -sh /tmp
   
   # Check application logs directory
   du -sh logs/
   
   # If disk is full:
   # - Clean up old logs
   # - Remove temporary files
   # - Increase disk size if needed
   ```

5. **Restart Transcoding Workers if Stuck**
   ```bash
   # Check worker process status
   ps aux | grep "videoProcessingWorker\|workers"
   
   # Check worker queue status
   # If using Redis/BullMQ:
   redis-cli -u $REDIS_URL LLEN bull:video-transcoding:waiting
   redis-cli -u $REDIS_URL LLEN bull:video-transcoding:active
   redis-cli -u $REDIS_URL LLEN bull:video-transcoding:failed
   
   # Restart workers
   # Stop current workers:
   pkill -f "videoProcessingWorker"
   # Or: kill [PID]
   
   # Start workers:
   bun run workers
   # Or: bun run dev:all
   ```

### Investigation Steps

1. **Check Upload Endpoint Status**
   ```bash
   # Test upload endpoint
   curl -X POST http://localhost:3001/api/upload/content \
     -H "Authorization: Bearer [TOKEN]" \
     -F "file=@test-video.mp4" \
     -F "title=Test Video"
   
   # Check for rate limiting
   # Review rate limit configuration
   # Check if user hit upload limits
   ```

2. **Check Video Processing Queue**
   ```bash
   # Check queue status
   # Review queue manager logs
   tail -f logs/combined.log | grep -i "queue\|job"
   
   # Check for failed jobs
   # In database or queue dashboard
   # Look for jobs stuck in "processing" state
   ```

3. **Check File Size Limits**
   ```bash
   # Verify multer configuration
   # Check: backend/src/routes/upload.ts
   # Current limit: 500MB (500 * 1024 * 1024)
   
   # Check if file exceeds limit
   # Review error messages for "file too large"
   ```

4. **Check Mux/Video Storage Integration**
   ```typescript
   // Verify Mux credentials
   // Check: backend/src/lib/storage/videoStorage.ts
   // Test Mux API connection
   
   // Check video storage service status
   // Review: backend/src/lib/storage/videoStorage.ts
   ```

5. **Check Content Status in Database**
   ```sql
   -- Check for stuck uploads
   SELECT 
     id,
     title,
     status,
     "createdAt",
     "updatedAt",
     "mediaUrl",
     "creatorId"
   FROM content
   WHERE status IN ('PENDING_REVIEW', 'PROCESSING')
   AND "createdAt" < NOW() - INTERVAL '1 hour'
   ORDER BY "createdAt" DESC;
   
   -- Check for failed uploads
   SELECT 
     id,
     title,
     status,
     "createdAt",
     "mediaUrl"
   FROM content
   WHERE status = 'FAILED'
   AND "createdAt" > NOW() - INTERVAL '24 hours'
   ORDER BY "createdAt" DESC;
   ```

### Resolution

- **If S3 permissions issue:** Fix IAM/user permissions, verify bucket policy
- **If transcoding service down:** Wait for service recovery, implement retry logic
- **If disk space full:** Clean up logs/temp files, increase disk size
- **If worker stuck:** Restart workers, clear stuck jobs from queue
- **If file too large:** Increase multer limit or reject with clear error
- **If queue backlog:** Scale up workers, optimize processing

### Prevention

- Set up S3 bucket monitoring
- Monitor transcoding service status (Mux/Cloudflare)
- Set up disk space alerts
- Monitor worker queue size
- Implement retry logic for failed uploads
- Set up alerts for upload failure rate
- Regular testing of upload flow
- Monitor file size distribution

---

## High Disk Usage

**Alert:** `disk_usage` - Disk usage exceeds 85%

### Symptoms
- Disk usage > 85%
- Potential write failures
- Log rotation issues

### Immediate Actions

1. **Check Disk Usage**
   ```bash
   # Check disk usage
   df -h
   
   # Check largest directories
   du -sh /* | sort -h
   ```

2. **Check Log Files**
   ```bash
   # Check log directory size
   du -sh logs/
   
   # Check log file sizes
   ls -lh logs/
   ```

3. **Check Temporary Files**
   ```bash
   # Check temp directory
   du -sh /tmp
   ```

### Investigation Steps

1. **Identify Large Files/Directories**
   - Check application logs
   - Check database logs
   - Check temporary files
   - Check uploaded files (if stored locally)

2. **Check Log Rotation**
   - Verify log rotation is working
   - Check log retention settings
   - Check if old logs need cleanup

3. **Check Database Size**
   ```sql
   -- Check database size
   SELECT pg_size_pretty(pg_database_size(current_database()));
   
   -- Check table sizes
   SELECT 
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;
   ```

### Resolution

- **If logs too large:** Rotate/compress/delete old logs
- **If database too large:** Archive old data, implement data retention
- **If temp files:** Clean up temporary files
- **If application files:** Move to external storage (S3/R2)

### Prevention

- Set up log rotation
- Implement data retention policies
- Monitor disk usage trends
- Set up alerts at 80% (warning) and 85% (critical)
- Use external storage for large files

---

## High Memory Usage

**Alert:** `memory_usage` - Memory usage exceeds 90%

### Symptoms
- High memory usage
- Potential OOM (Out of Memory) errors
- Slow application performance

### Immediate Actions

1. **Check Memory Usage**
   ```bash
   # Check system memory
   free -h
   
   # Check process memory
   ps aux --sort=-%mem | head -10
   ```

2. **Check Application Memory**
   - Check Node.js heap usage
   - Check for memory leaks
   - Review recent code changes

3. **Check for Memory Leaks**
   - Review application logs
   - Check for unclosed resources
   - Check for growing data structures

### Investigation Steps

1. **Identify Memory Consumers**
   - Check which processes use most memory
   - Check application memory usage
   - Check for memory leaks in code

2. **Check Application Code**
   - Review recent changes
   - Check for memory leaks
   - Check for large data structures

3. **Check System Resources**
   - Check if system has enough memory
   - Check swap usage
   - Check for memory pressure

### Resolution

- **If memory leak:** Fix code, restart application
- **If insufficient memory:** Scale up memory, optimize memory usage
- **If application issue:** Restart application, rollback if needed

### Prevention

- Set up memory monitoring
- Regular memory profiling
- Code reviews for memory leaks
- Set up alerts at 80% (warning) and 90% (critical)
- Implement memory limits

---

## Health Check Failure

**Alert:** `health_check_failure` - Health check endpoint returned unhealthy

### Symptoms
- Health check endpoint returns 503
- One or more services unhealthy
- Load balancer marking instance as unhealthy

### Immediate Actions

1. **Check Health Endpoint**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check Individual Services**
   ```bash
   # Check database
   curl http://localhost:3001/health/ready
   
   # Check detailed health
   curl http://localhost:3001/health/detailed
   ```

3. **Check Service Status**
   - Database connection
   - Redis connection
   - S3/R2 access
   - External dependencies

### Investigation Steps

1. **Identify Unhealthy Service**
   - Check health check response
   - Identify which service is failing
   - Check service logs

2. **Check Service Dependencies**
   - Database connectivity
   - Redis connectivity
   - External API status
   - Network connectivity

3. **Check Application Logs**
   - Check for errors
   - Check for connection failures
   - Check for timeout errors

### Resolution

- **If database down:** Check database status, restart if needed
- **If Redis down:** Check Redis status, application can run without Redis
- **If S3 down:** Check S3 status, implement fallbacks
- **If application issue:** Restart application, check logs

### Prevention

- Set up health check monitoring
- Implement graceful degradation
- Set up dependency monitoring
- Regular health check testing

---

## Redis Connection Failure

**Alert:** `redis_connection_failure` - Redis connection failed

### Symptoms
- Redis connection errors
- Cache not working
- Application may still function (Redis is optional)

### Immediate Actions

1. **Check Redis Status**
   ```bash
   # Check Redis connection
   redis-cli -u $REDIS_URL ping
   ```

2. **Check Application Logs**
   - Look for Redis connection errors
   - Check if application is handling Redis failures gracefully

3. **Check Redis Service**
   - Check if Redis is running
   - Check Redis logs
   - Check network connectivity

### Investigation Steps

1. **Check Redis Configuration**
   - Verify REDIS_URL is correct
   - Check Redis credentials
   - Check network access

2. **Check Redis Service**
   - Check if Redis is running
   - Check Redis memory usage
   - Check Redis logs

3. **Check Network**
   - Check network connectivity
   - Check firewall rules
   - Check DNS resolution

### Resolution

- **If Redis down:** Restart Redis service
- **If configuration issue:** Fix configuration
- **If network issue:** Fix network connectivity
- **Note:** Application can run without Redis (degraded performance)

### Prevention

- Set up Redis monitoring
- Implement graceful degradation
- Set up Redis alerts
- Regular Redis health checks

---

## Queue Processing Delays

**Alert:** `queue_processing_time` - P95 queue processing time exceeds 5 minutes

### Symptoms
- Jobs taking too long to process
- Queue size growing
- Users experiencing delays

### Immediate Actions

1. **Check Queue Status**
   ```bash
   # Check queue size (if using Redis)
   redis-cli -u $REDIS_URL LLEN queue:default
   ```

2. **Check Worker Status**
   - Check if workers are running
   - Check worker logs
   - Check worker CPU/memory usage

3. **Check Processing Times**
   - Check recent job processing times
   - Identify slow jobs
   - Check for stuck jobs

### Investigation Steps

1. **Identify Slow Jobs**
   - Check job types that are slow
   - Check job processing times
   - Check for stuck jobs

2. **Check Worker Resources**
   - CPU usage
   - Memory usage
   - Disk I/O

3. **Check Dependencies**
   - External API response times
   - Database query performance
   - Network latency

### Resolution

- **If workers overloaded:** Scale up workers
- **If slow jobs:** Optimize job processing, add timeouts
- **If stuck jobs:** Clear stuck jobs, restart workers
- **If dependency slow:** Optimize dependencies, add caching

### Prevention

- Set up queue monitoring
- Implement job timeouts
- Regular performance testing
- Monitor queue size trends
- Set up alerts for queue size and processing time

---

## General Incident Response Process

1. **Acknowledge Alert**
   - Acknowledge in PagerDuty/Opsgenie
   - Notify team if needed

2. **Assess Impact**
   - Check user impact
   - Check service status
   - Check error rates

3. **Investigate**
   - Follow runbook steps
   - Check logs and metrics
   - Identify root cause

4. **Resolve**
   - Apply fix
   - Verify resolution
   - Monitor for recurrence

5. **Post-Mortem**
   - Document incident
   - Identify improvements
   - Update runbooks if needed

---

## Escalation

If you cannot resolve the incident:

1. **Level 1 (0-15 minutes):** Primary on-call engineer (@on-call-primary in Discord)
2. **Level 2 (15-30 minutes):** Secondary on-call engineer (@on-call-secondary in Discord)
3. **Level 3 (30+ minutes):** Engineering team lead / Manager (@on-call-team in Discord)

For critical incidents (P1), escalate immediately to Level 2.

---

## Contact Information

- **On-Call Schedule:** Check Discord #incidents channel topic or @on-call-primary role
- **Discord Channel:** #incidents (for critical alerts and coordination)
- **Discord Channel:** #alerts (for all monitoring alerts)
- **Sentry Dashboard:** Check Sentry for error details
- **Emergency Contact:** [Add emergency contact]

---

**Last Updated:** [Date]
**Maintained By:** Engineering Team

