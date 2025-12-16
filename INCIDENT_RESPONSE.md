# Incident Response Guide

Quick reference guide for incident response and on-call procedures.

## 🚨 Quick Response Checklist

### When Alert Triggers

1. **Acknowledge Alert** (within 15 minutes)
   - Acknowledge in PagerDuty/Opsgenie
   - Post in #incidents Slack channel
   - Assess severity

2. **Initial Investigation** (within 30 minutes)
   - Check health endpoints: `/health/ready`, `/health/detailed`
   - Review error logs: `tail -f logs/error.log`
   - Check monitoring dashboards
   - Review recent deployments

3. **Escalate if Needed**
   - Not resolved in 30 min → Escalate to Level 2
   - Critical business impact → Escalate immediately
   - Need additional expertise → Escalate

## 📞 On-Call Contacts

### Primary On-Call
- **Schedule**: Weekdays 9 AM - 6 PM
- **Rotation**: Weekly
- **Contact**: PagerDuty/Opsgenie

### Secondary On-Call
- **Schedule**: Evenings and weekends
- **Rotation**: Weekly
- **Contact**: PagerDuty/Opsgenie

### Escalation Contacts
- **Level 2**: Senior Engineer
- **Level 3**: Engineering Manager
- **Level 4**: CTO/VP Engineering

## 🔧 Common Incidents

### High Error Rate

**Quick Fix:**
1. Check `/health/ready` endpoint
2. Review error logs for patterns
3. Check recent deployments
4. Rollback if needed

**Full Procedure**: See [RUNBOOKS.md](./RUNBOOKS.md#high-error-rate)

### Slow Response Times

**Quick Fix:**
1. Check database query performance
2. Review slow query logs
3. Check system resources (CPU, memory)
4. Scale if needed

**Full Procedure**: See [RUNBOOKS.md](./RUNBOOKS.md#high-p99-response-time)

### Health Check Failure

**Quick Fix:**
1. Check service is running
2. Check database connection
3. Check Redis connection
4. Restart service if needed

**Full Procedure**: See [RUNBOOKS.md](./RUNBOOKS.md#health-check-failure)

## 📊 Monitoring Tools

### Health Endpoints
- Basic: `GET /health`
- Readiness: `GET /health/ready`
- Liveness: `GET /health/live`
- Detailed: `GET /health/detailed`

### Logs
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Application logs: Winston logger

### Dashboards
- Datadog: APM and metrics
- Sentry: Error tracking
- Custom: Health check endpoints

## 🚀 Deployment Rollback

### Quick Rollback
```bash
# If using Kubernetes
kubectl rollout undo deployment/dreamlust-api

# If using Docker
docker-compose down
docker-compose up -d --scale api=previous-version
```

### Verify Rollback
1. Check health endpoints
2. Monitor error rates
3. Verify functionality
4. Notify team

## 📝 Post-Incident

### Within 24 Hours
- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] Document resolution
- [ ] Update runbooks if needed

### Within 1 Week
- [ ] Conduct post-mortem
- [ ] Create action items
- [ ] Implement preventive measures
- [ ] Update monitoring

## 🔗 Resources

- **Runbooks**: [RUNBOOKS.md](./RUNBOOKS.md)
- **Monitoring**: [Monitoring README](./backend/src/lib/monitoring/README.md)
- **Health Checks**: [HEALTH_CHECKS.md](./HEALTH_CHECKS.md)


