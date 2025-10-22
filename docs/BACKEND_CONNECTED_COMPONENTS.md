# Backend-connected components

This document summarizes how the frontend integrates with the backend on this branch. It is meant for development and review; the final integration branch intentionally omits docs/tests per project policy.

## API surface (backend)

Exposed by the mock backend in `backend/src/index.js` (Fastify on port 8000):

- GET `/api/health` → `{ status: 'ok', ts }` health probe
- GET `/api/players` → `Array<{ id: string, alias: string }>` list of players
- GET `/api/tournament` → `{ players, schedule, currentMatchIndex }` basic tournament snapshot
- POST `/api/log` → `{ ok: true }` generic log sink (for future use)

## Frontend consumers

- `src/apiClient.ts`
  - `fetchPlayers(): Promise<RemotePlayer[] | null>` → GET `/api/players`
  - `fetchTournament(): Promise<RemoteTournament | null>` → GET `/api/tournament`
  - Uses a safe wrapper that returns `null` on errors and does not throw.

Notes:
- The frontend treats remote calls as optional. If the backend is down or returns non-200, `null` is returned and the app falls back to local state without breaking UX.

## Dev proxy and production

- Dev: `webpack.config.js` proxies `/api` to `http://localhost:8000` (changeOrigin=true). Run the backend locally on port 8000 during development.
- Prod: The provided `nginx/nginx.conf` serves the SPA with strong security headers but does not include an `/api` proxy. For same-origin deployments, configure your ingress/proxy to route `/api` to the backend service (or enable CORS if served from a different origin).

## How to run (dev)

1. Backend (from repo root):
   - `cd backend`
   - `npm ci`
   - `npm start` (default PORT=8000)
2. Frontend (separate terminal):
   - `npm ci`
   - `npm run dev`
   - Open https://localhost:3000 (accept the dev certificate if prompted)

## Integration points in UI/state

- Tournament and player lists can be hydrated from `fetchTournament()` and `fetchPlayers()` if you wire them into `src/state/gameState` or initializers. Current build keeps remote fetch optional to remain fully offline-capable for evaluation.

## ELK note (optional dev-only)

- Client-side log sender in `src/main.ts` can POST simple JSON logs to a local Logstash HTTP input at `http://localhost:8080` when `localStorage.setItem('elk', 'on')` is set. This is disabled by default, and does not affect production builds.
