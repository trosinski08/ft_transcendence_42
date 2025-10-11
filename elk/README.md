# ELK Stack Infrastructure - ft_transcendence Pong

## 📋 Overview

This directory contains the **ELK (Elasticsearch, Logstash, Kibana)** stack configuration for centralized logging and monitoring of the ft_transcendence Pong application. This setup satisfies the **Major DevOps module** requirement from the subject.

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │     │  Backend    │     │    Nginx    │     │  Database   │
│   :3000     │     │   :4000     │     │    :443     │     │   :5432     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ HTTP :8080        │ HTTP :8081        │ HTTP :8082        │ HTTP :8083
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                      │
                               ┌──────▼──────┐
                               │  Logstash   │
                               │   :5000     │
                               │   :9600     │
                               └──────┬──────┘
                                      │
                               ┌──────▼──────┐
                               │Elasticsearch│
                               │   :9200     │
                               │   :9300     │
                               └──────┬──────┘
                                      │
                               ┌──────▼──────┐
                               │   Kibana    │
                               │   :5601     │
                               └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 1.29+
- At least 4GB RAM available for Docker
- Ports 5601, 9200, 8080-8083 available

### Start the ELK Stack

```bash
# From the elk/ directory
docker-compose -f docker-compose.elk.yml up -d

# Check service health
docker-compose -f docker-compose.elk.yml ps

# View logs
docker-compose -f docker-compose.elk.yml logs -f
```

### Access Points

| Service       | URL                          | Purpose                           |
|---------------|------------------------------|-----------------------------------|
| Kibana        | http://localhost:5601        | Log visualization dashboard       |
| Elasticsearch | http://localhost:9200        | Search engine API                 |
| Logstash      | http://localhost:9600        | Logstash monitoring API           |

### Stop the Stack

```bash
docker-compose -f docker-compose.elk.yml down

# To remove volumes (WARNING: deletes all logs)
docker-compose -f docker-compose.elk.yml down -v
```

## 📊 Port Mappings

### External Ports (exposed to host)
- **5601**: Kibana web UI
- **9200**: Elasticsearch REST API
- **9300**: Elasticsearch node communication
- **8080**: Logstash HTTP input for **Frontend** logs
- **8081**: Logstash HTTP input for **Backend** logs
- **8082**: Logstash HTTP input for **Nginx** logs
- **8083**: Logstash HTTP input for **Database** logs
- **5000**: Logstash Beats input (optional, for filebeat/metricbeat)
- **9600**: Logstash monitoring API

### Internal Network
All services communicate via the `elk-network` bridge network.

## 🔌 Integration with Application Services

### Frontend Integration

Add to your frontend application to send logs to Logstash:

```typescript
// Example: Send frontend logs to Logstash
async function sendLog(level: string, message: string, metadata?: any) {
  try {
    await fetch('http://localhost:8080', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        sessionId: sessionStorage.getItem('sessionId'),
        eventType: metadata?.eventType,
        ...metadata
      })
    });
  } catch (error) {
    console.error('Failed to send log to Logstash:', error);
  }
}

// Usage examples
sendLog('INFO', 'Game started', { eventType: 'game_start' });
sendLog('ERROR', 'API call failed', { eventType: 'api_error', endpoint: '/api/players' });
```

### Backend Integration

Add to your backend (Node.js/Fastify example):

```typescript
// Example: Backend middleware for request logging
fastify.addHook('onResponse', async (request, reply) => {
  const logData = {
    level: reply.statusCode >= 400 ? 'ERROR' : 'INFO',
    message: `${request.method} ${request.url}`,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.getResponseTime(),
    userAgent: request.headers['user-agent']
  };

  await fetch('http://logstash:8081', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData)
  }).catch(err => console.error('Log send failed:', err));
});
```

### Nginx Integration

Add to your `nginx.conf`:

```nginx
# Send access logs to Logstash
log_format json_combined escape=json
  '{'
    '"timestamp":"$time_iso8601",'
    '"client_ip":"$remote_addr",'
    '"method":"$request_method",'
    '"path":"$request_uri",'
    '"status_code":$status,'
    '"bytes_sent":$bytes_sent,'
    '"user_agent":"$http_user_agent",'
    '"referrer":"$http_referer",'
    '"log_type":"access"'
  '}';

access_log syslog:server=logstash:8082 json_combined;
error_log syslog:server=logstash:8082;
```

### Database Integration

For PostgreSQL, configure logging and use a log shipper or custom script to send to Logstash port 8083.

## 📈 Kibana Setup

### First-Time Configuration

1. **Access Kibana**: Navigate to http://localhost:5601
2. **Create Index Patterns**:
   - Go to **Management** → **Stack Management** → **Index Patterns**
   - Create patterns for:
     - `pong-frontend-*` (Frontend logs)
     - `pong-backend-*` (Backend logs)
     - `pong-nginx-*` (Nginx logs)
     - `pong-database-*` (Database logs)
   - Use `@timestamp` as the time field

3. **View Logs**:
   - Go to **Analytics** → **Discover**
   - Select your index pattern
   - Logs will appear as they're sent

### Useful Queries

```
# Find all errors
level: ERROR

# Frontend game events
tags: frontend AND eventType: game_start

# Slow backend requests
tags: backend AND responseTime > 1000

# 404 errors from nginx
tags: nginx AND status_code: 404

# Database slow queries
tags: database AND queryTime > 0.5
```

### Create Dashboards

1. Go to **Analytics** → **Dashboard**
2. Click **Create dashboard**
3. Add visualizations:
   - **Error rate over time** (Line chart)
   - **Requests by endpoint** (Pie chart)
   - **Response time percentiles** (Metrics)
   - **Geographic distribution** (Map - if GeoIP enabled)

## 🔧 Configuration Files

### `docker-compose.elk.yml`
Main orchestration file defining:
- Elasticsearch (single-node, 512MB heap)
- Logstash (with custom pipeline)
- Kibana (connected to Elasticsearch)
- Health checks for all services
- Volume persistence for Elasticsearch data

### `logstash/logstash.conf`
Pipeline configuration with:
- **Input plugins**: HTTP inputs on ports 8080-8083, Beats input on 5000
- **Filter plugins**: 
  - Source-specific processing (frontend, backend, nginx, database)
  - Timestamp parsing
  - HTTP metadata extraction
  - Error severity classification
  - Optional GeoIP enrichment
- **Output plugins**: Route to source-specific daily indices

## 🧪 Testing the Setup

### 1. Verify Services Are Running

```bash
# Check all containers are healthy
docker-compose -f docker-compose.elk.yml ps

# All should show "Up" and "healthy"
```

### 2. Send Test Logs

```bash
# Test frontend log endpoint
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Test frontend log",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "sessionId": "test-session-123",
    "eventType": "test"
  }'

# Test backend log endpoint
curl -X POST http://localhost:8081 \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "Test backend log",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "method": "GET",
    "path": "/api/test",
    "statusCode": 200,
    "responseTime": 45
  }'
```

### 3. Verify in Kibana

1. Open http://localhost:5601
2. Go to **Discover**
3. Create index pattern `pong-*` to see all logs
4. You should see your test logs appear within seconds

### 4. Check Elasticsearch Directly

```bash
# List all indices
curl http://localhost:9200/_cat/indices?v

# Query frontend logs
curl http://localhost:9200/pong-frontend-*/_search?pretty

# Get index stats
curl http://localhost:9200/_cluster/health?pretty
```

## 📦 Data Persistence

Elasticsearch data is persisted in a Docker volume named `elasticsearch-data`. This means:
- ✅ Logs survive container restarts
- ✅ Data persists across `docker-compose down`
- ❌ Data is removed with `docker-compose down -v`

### Backup Strategy (Future Enhancement)

For production, consider:
- Elasticsearch snapshots to S3/Azure Blob
- Index Lifecycle Management (ILM) for automatic retention
- Cluster replication for high availability

## 🔒 Security Considerations

**Current Setup (Development)**:
- ⚠️ Security features disabled (`xpack.security.enabled=false`)
- ⚠️ No authentication required
- ⚠️ Ports exposed to localhost only

**Production Recommendations**:
- ✅ Enable X-Pack Security
- ✅ Configure TLS/SSL for inter-node communication
- ✅ Set up user authentication and role-based access
- ✅ Use reverse proxy (nginx) for external access
- ✅ Implement log data retention policies
- ✅ Enable audit logging

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs for specific service
docker-compose -f docker-compose.elk.yml logs elasticsearch
docker-compose -f docker-compose.elk.yml logs logstash
docker-compose -f docker-compose.elk.yml logs kibana

# Common issues:
# - Insufficient RAM: Increase Docker memory limit to 4GB+
# - Port conflicts: Check if ports 5601, 9200, 8080-8083 are free
# - Permission errors: Check file permissions for logstash.conf
```

### Logs Not Appearing in Kibana

1. **Check Logstash is receiving data**:
   ```bash
   docker-compose -f docker-compose.elk.yml logs logstash | grep "200"
   ```

2. **Verify Elasticsearch has data**:
   ```bash
   curl http://localhost:9200/_cat/indices?v
   ```

3. **Refresh Kibana index patterns**:
   - Go to **Stack Management** → **Index Patterns**
   - Click refresh icon next to time field

4. **Check time range** in Discover view (default is last 15 minutes)

### High Memory Usage

```bash
# Reduce Elasticsearch heap size in docker-compose.elk.yml
# Change: "ES_JAVA_OPTS=-Xms512m -Xmx512m"
# To:     "ES_JAVA_OPTS=-Xms256m -Xmx256m"

# Reduce Logstash heap size
# Change: "LS_JAVA_OPTS=-Xms256m -Xmx256m"
# To:     "LS_JAVA_OPTS=-Xms128m -Xmx128m"
```

## 📚 Next Steps

### For Backend Developer

1. **Review the backend integration example** above
2. **Implement logging middleware** in Fastify/Express
3. **Test with `curl` to port 8081** before integrating
4. **Add structured logging** with consistent field names
5. **Include correlation IDs** for request tracing

### For DevOps Engineer

1. **Review production security recommendations**
2. **Implement index lifecycle management** (ILM)
3. **Set up automated backups** using Elasticsearch snapshots
4. **Configure alerting** in Kibana for critical errors
5. **Deploy to production** with TLS and authentication

### For Frontend Developer

1. **Implement the `sendLog` function** in your frontend
2. **Add error boundary logging** to catch unhandled errors
3. **Log user interactions** (game events, navigation, errors)
4. **Include session tracking** for better debugging
5. **Test with network tab** to verify logs are sent

## 🎯 Subject Compliance

This ELK stack implementation satisfies:

**Module Name**: Infrastructure setup for log management  
**Type**: Major  
**Category**: IV.7 - Devops  
**Requirements Met**:
- ✅ Centralized logging infrastructure
- ✅ Log aggregation from multiple sources
- ✅ Visualization and search capabilities
- ✅ Scalable architecture for production use
- ✅ Docker-based deployment

## 📖 Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [ELK Stack Best Practices](https://www.elastic.co/guide/en/elasticsearch/reference/current/best-practices.html)

## 📄 License

This configuration is part of the ft_transcendence project and follows the same license.

---

**Questions or Issues?** Contact the DevOps team or check the project documentation.
