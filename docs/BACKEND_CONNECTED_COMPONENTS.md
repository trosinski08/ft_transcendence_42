# Backend-connected components

This document summarizes how the frontend integrates with the backend on this branch and describes the minimal steps to implement a compliant backend for the project. The final integration branch intentionally omits docs/tests per policy; use this file for development and review on feature branches.

## Goals and scope (subject-aligned)

At minimum, the backend should provide:











- User identity and session management (OAuth login recommended), optional 2FA
- Player directory and basic profile data (alias, avatar)
- Matchmaking and tournament orchestration endpoints
- Match persistence (scores, winners, timestamps) and leaderboard/stats
- Real-time game coordination channel (WebSocket) for online matches
- Logging/observability hooks (optional in dev)

This repo currently ships a mock service to unblock frontend development. Below are concrete steps to evolve it into a subject-compliant backend.

## Current mock API (existing in repo)

Exposed by `backend/src/index.js` (Fastify, default port 8000):
- GET `/api/health` → `{ status: 'ok', ts }`
- GET `/api/players` → `Array<{ id: string, alias: string }>`
- GET `/api/tournament` → `{ players, schedule, currentMatchIndex }`
- POST `/api/log` → `{ ok: true }` (dev-only sink)

## Frontend consumers (already wired)

- `src/apiClient.ts`
   - `fetchPlayers(): Promise<RemotePlayer[] | null>` → GET `/api/players`
   - `fetchTournament(): Promise<RemoteTournament | null>` → GET `/api/tournament`
   - Safe wrapper returns `null` on errors so the SPA falls back to local state.

## Implementation plan to reach subject compliance

Suggested stack: Fastify (Node.js) + PostgreSQL + Prisma (ORM) + WebSocket (fastify-websocket). Auth via OAuth (e.g., 42 OAuth) + JWT cookies.

1) Project structure (backend/)
- `src/app.ts` (create fastify instance, register plugins)
- `src/plugins/` (cors, jwt, cookie, websocket, prisma, rate-limit)
- `src/routes/` (auth.ts, users.ts, matches.ts, tournament.ts, ws.ts)
- `src/services/` (users, matches, tournament)
- `src/schemas/` (zod or JSON schema for input/output)

2) Environment and secrets
Create `backend/.env` (don’t commit):
- `DATABASE_URL=postgresql://user:pass@postgres:5432/app` 
- `JWT_SECRET=change_me`
- `OAUTH_CLIENT_ID=...`
- `OAUTH_CLIENT_SECRET=...`
- `OAUTH_REDIRECT_URI=https://<host>/api/auth/callback`
- `PORT=8000`

3) Database models (minimal)
- `User(id uuid pk, login text uniq, alias text, avatar text, twoFASecret text null, createdAt ts)`
- `Match(id uuid pk, p1Id uuid fk, p2Id uuid fk, score1 int, score2 int, winnerId uuid fk, ts timestamptz)`
- `Friendship(userId uuid fk, friendId uuid fk, createdAt ts)`
- `Block(userId uuid fk, blockedId uuid fk, createdAt ts)`
Implement with Prisma:
- Add `prisma/schema.prisma`
- `npm i -D prisma` + `npm i @prisma/client`
- `npx prisma init` → configure `DATABASE_URL`
- `npx prisma migrate dev -n init`

4) Auth (OAuth + JWT cookies)
- Register OAuth app (e.g., 42 Intra) with callback to `/api/auth/callback`.
- Routes:
   - `GET /api/auth/login` → redirect to provider
   - `GET /api/auth/callback` → exchange code→token, fetch profile, upsert User, set `session` cookie (JWT, httpOnly, secure, sameSite=lax)
   - `POST /api/auth/2fa/setup` → generate TOTP secret/QR (otplib), store hashed secret
   - `POST /api/auth/2fa/verify` → verify code, mark 2FA enabled
   - `POST /api/auth/logout` → clear cookie
- `GET /api/me` returns current user (from JWT)

5) Core REST endpoints
- `GET /api/players` → list of public player profiles
- `GET /api/tournament` → active tournament snapshot (or empty)
- `POST /api/tournament/schedule` (admin) → generate schedule
- `POST /api/matches` → record a finished match `{ p1Id, p2Id, score1, score2 }`
- `GET /api/matches/recent` → latest matches
- `GET /api/leaderboard` → top players by rating/win ratio
- `POST /api/friends/:id` and `DELETE /api/friends/:id`
- `POST /api/blocks/:id` and `DELETE /api/blocks/:id`

6) Real-time (WebSocket)
- Upgrade endpoint: `GET /api/ws`
- Events (JSON):
   - `join_queue` → server pairs players and emits `match_found`
   - `match_found` → `{ roomId, p1, p2 }`
   - `input` → `{ up: boolean, down: boolean }`
   - `state` → authoritative ball/paddle positions; tick at ~30–60 Hz for online mode
   - `score` → emitted on score change; at end, server persists Match

7) Security baseline
- CORS: allow frontend origin in dev; same-origin in prod
- Cookies: `httpOnly`, `secure` (HTTPS), `sameSite=lax`
- Rate limit: login, 2FA, matchmaking endpoints
- Validation: zod/JSONSchema for all inputs
- Helmet-like headers at Nginx (already present)

8) Production wiring (Nginx + Docker)
- Nginx: add an `/api` upstream and WS headers (example snippet; do not commit into integration if docs-free is required):
   - `location /api { proxy_pass http://backend:8000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }`
- Docker Compose: add backend + postgres services to the existing network `appnet`.

Example compose extension (dev/prod), do not commit if not desired on integration:
```yaml
services:
   backend:
      build: ./backend
      environment:
         - PORT=8000
         - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
         - JWT_SECRET=dev_secret
      ports:
         - "8000:8000"
      depends_on:
         - postgres
      networks:
         - appnet

   postgres:
      image: postgres:15
      environment:
         - POSTGRES_DB=app
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=postgres
      volumes:
         - pgdata:/var/lib/postgresql/data
      networks:
         - appnet

networks:
   appnet:
      external: true

volumes:
   pgdata:
```

9) Dev workflow
1. Start DB: `docker compose up -d postgres` (or the full stack with backend)
2. Backend:
    - `cd backend && npm ci`
    - Configure `.env` and Prisma
    - `npm run dev` (nodemon/ts-node if TypeScript)
3. Frontend: `npm run dev` (webpack dev server proxies `/api` → `localhost:8000`)

10) Acceptance checklist
- [ ] Login via OAuth creates/returns a user; 2FA optional and enforced when enabled
- [ ] REST endpoints for players, matches, leaderboard work and validate inputs
- [ ] Online match can be created and played over WS (authoritative server state)
- [ ] Finished match is persisted; recent list and stats update
- [ ] Nginx proxies `/api` and WS in prod; cookies secure; CSP intact

## Dev proxy and production (current state)
- Dev: `webpack.config.js` proxies `/api` to `http://localhost:8000` (changeOrigin=true). Run the backend on port 8000.
- Prod: Current `nginx/nginx.conf` serves the SPA with strict security headers and no `/api` proxy. For same-origin deployment, add an `/api` upstream as shown above (keep this change outside the integration branch if you must keep it docs-free).

## How to run (current mock)
1. Backend:
    - `cd backend`
    - `npm ci`
    - `npm start` (default PORT=8000)
2. Frontend:
    - `npm ci`
    - `npm run dev`
    - Open https://localhost:3000 (accept the dev certificate if prompted)

## ELK note (optional dev-only)
- Client-side log sender in `src/main.ts` can POST JSON logs to a local Logstash HTTP input at `http://localhost:8080` when `localStorage.setItem('elk', 'on')` is set. Disabled by default; does not affect production builds.
