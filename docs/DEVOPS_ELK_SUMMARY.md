# DevOps – ELK (Elasticsearch, Logstash, Kibana) Summary

This file lists only the DevOps/ELK-related artifacts present in this repository and how they satisfy the subject’s DevOps major module: Infrastructure setup for log management.

## Files and directories

- `elk/docker-compose.elk.yml` — Orchestrates Elasticsearch, Logstash, and Kibana with health checks, volumes, and an isolated bridge network.
- `elk/logstash/logstash.conf` — Logstash pipeline with HTTP inputs per source (frontend/backend/nginx/database), optional Beats input, filters (timestamp parsing, enrichment, severity classification, geoip), and output to source-specific daily indices.
- `elk/logstash/patterns/` — Grok patterns and docs for parsing (see README inside).
- `elk/README.md` — Detailed runbook for starting, testing, and using the ELK stack, including integration snippets for the frontend, backend, and nginx.

Related production serving (security headers and SPA fallback):
- `nginx/nginx.conf` — TLS, HSTS, CSP, and other headers; SPA fallback; not ELK-specific, but relevant to ops hardening when fronting the app.

## How to run (development)

From the `elk/` directory:

```bash
docker-compose -f docker-compose.elk.yml up -d
docker-compose -f docker-compose.elk.yml ps
```

Access points:
- Kibana: http://localhost:5601
- Elasticsearch: http://localhost:9200
- Logstash monitoring: http://localhost:9600 (internal)

HTTP inputs exposed by Logstash (for testing or direct app integration):
- Frontend logs: POST http://localhost:8080
- Backend logs: POST http://localhost:8081
- Nginx logs: POST http://localhost:8082
- Database logs: POST http://localhost:8083
- Beats (optional): 5000/tcp, 5000/udp

Stop the stack:

```bash
docker-compose -f docker-compose.elk.yml down
# Remove volumes (deletes all logs):
docker-compose -f docker-compose.elk.yml down -v
```

## Integrations (where to wire logs)

- Frontend: send JSON logs to Logstash HTTP input (8080). See example in `elk/README.md` (sendLog helper).
- Backend: send structured request logs to 8081 (example middleware in `elk/README.md`).
- Nginx: configure `access_log` and `error_log` to syslog target pointing at Logstash 8082 (snippet in `elk/README.md`).
- Database: forward slow query/application logs to 8083.

## Indices and discovery

Logstash outputs to daily indices by source:
- `pong-frontend-YYYY.MM.dd`
- `pong-backend-YYYY.MM.dd`
- `pong-nginx-YYYY.MM.dd`
- `pong-database-YYYY.MM.dd`

In Kibana, create index patterns (e.g., `pong-*` or one per source) with `@timestamp` as the time field to explore logs in Discover and build dashboards.

## Security notes

This stack is configured for local development:
- X-Pack security disabled; no auth/TLS between nodes.
- Exposed ports are bound to localhost; adjust for production.

For production hardening:
- Enable X-Pack security (authn/authz), TLS for ES/Logstash/Kibana, and restricted ingress.
- Add Index Lifecycle Management (ILM) and snapshot backups.
- Front via a reverse proxy with strict headers (see `nginx/nginx.conf`).

## Quick smoke test

After the stack is up, send a test log and verify in Kibana:

```bash
curl -X POST http://localhost:8080 \
  -H 'Content-Type: application/json' \
  -d '{"level":"INFO","message":"Test frontend log","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'

curl http://localhost:9200/_cat/indices?v | grep pong-frontend || true
```

If indices are present, create the `pong-*` index pattern in Kibana and inspect logs under Analytics → Discover.
