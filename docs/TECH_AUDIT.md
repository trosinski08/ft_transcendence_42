# Technical Audit Checklist

## NestJS API
- [ ] DTO validation with class-validator/class-transformer
- [ ] Global validation pipe and exception filter
- [ ] Auth guards (JWT/OAuth 42), CSRF for web flows
- [ ] Password hashing (argon2/bcrypt), 2FA option
- [ ] Rate limiting and brute-force protection

## Database
- [ ] Postgres schema migrations (Prisma/TypeORM)
- [ ] Unique constraints (aliases, emails)
- [ ] Referential integrity for matches and stats

## Logging
- [ ] Structured logs (JSON) with correlation IDs
- [ ] Request/response logging with redaction of secrets
- [ ] FE logs shipped to backend or ELK (optional)

## Metrics & Dashboards
- [ ] Basic Prometheus metrics (req/sec, latency, errors)
- [ ] Business KPIs (matches played, win rate distribution)
- [ ] Grafana dashboard templates

## Security
- [ ] CSP headers and helmet configuration
- [ ] Input sanitization and server-side validation
- [ ] Role-based access control (admin endpoints)

## Tracing
- [ ] OpenTelemetry instrumentation (optional)
- [ ] Trace sampling and export to Jaeger/Tempo

## Frontend
- [ ] TypeScript strict mode and ESLint rules
- [ ] Tailwind utility adoption and component consistency
- [ ] Accessibility review (keyboard, ARIA, color contrast)

## Delivery
- [ ] Docker images with minimal base (alpine/distroless)
- [ ] CI: lint, typecheck, unit tests, build, image scan
- [ ] Release tags and changelog
