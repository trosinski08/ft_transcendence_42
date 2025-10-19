# Mock API for Frontend Integration

This document describes a minimal mock backend used during local development to feed the frontend with data. It mirrors the endpoints the frontend calls and can be swapped with the real backend later.

## Where it lives

The mock backend implementation is in the monorepo sibling folder:

- Repo: `ft_transendence42`
- Path: `backend/src/index.js` (Fastify)
- Branch: `feature/backend-mock`

Frontend repo proxy (for local dev):
- `ft_transcendence_frontend_repo/webpack.config.js` proxies `/api/*` → `http://localhost:8000`

## Run locally (no Docker)

1) Start the backend:
   - Open a terminal in `ft_transendence42/backend`
   - Install deps: `npm install`
   - Start: `node src/index.js`
   - Server listens on `http://localhost:8000`

2) Start the frontend dev server:
   - In `ft_transcendence_frontend_repo`
   - `npm run dev`
   - Open `http://localhost:3000`

3) Test endpoints:
   - `curl http://localhost:8000/api/health`
   - `curl http://localhost:8000/api/players`
   - `curl http://localhost:8000/api/tournament`

## Endpoints

- GET `/api/health` → `{ status: 'ok', ts }`
- GET `/api/players` → `[{ id, alias }, ...]` (in-memory sample)
- GET `/api/tournament` → `{ players, schedule, currentMatchIndex }`
- POST `/api/log` → `{ ok: true }` (backend logs request body)

## Aligning with the target backend

When wiring the real backend, ensure:
- The base path `/api` is preserved (nginx proxies `/api/*` to backend).
- Responses are JSON with appropriate `Content-Type: application/json`.
- Frontend expects:
  - `/api/players`: array of `{ id: string, alias: string }`
  - `/api/tournament`: object with `{ players: RemotePlayer[], schedule: any[], currentMatchIndex: number|null }`

If the real backend differs, either update the frontend `src/apiClient.ts` to match new shapes or add compatibility mapping in the backend layer.

## Notes

- CORS is enabled on the mock backend for local usage.
- The mock is in-memory only; no persistence.
- Docker Compose in `ft_transendence42/docker-compose.yml` proxies `/api` through nginx when running full stack.# Mock API (Contract-First)

This folder documents the minimal API contracts the frontend expects, so backend work can proceed independently.

## Base URL
- Production (via Nginx): `/api`
- Dev: configurable later; frontend currently uses localStorage only.

## Endpoints (Proposed)
- `GET /api/players` → 200 OK: `Player[]`
- `POST /api/players` (body: `{ alias: string }`) → 201 Created: `Player`
- `GET /api/tournament` → 200 OK: `{ players: Player[], schedule: Match[], currentMatchIndex: number|null }`
- `POST /api/tournament` (body: `{ action: 'rebuild'|'reset' }`) → 200 OK: same as GET
- `POST /api/matches/:index/result` (body: `{ winner: 'p1'|'p2' }`) → 200 OK: `{ ok: true }`

### Types
```ts
interface Player { id: string; alias: string }
interface Match { p1: string; p2: string; status: 'pending'|'playing'|'done'; winner?: string }
```

## Sample Payloads
- `GET /api/players`
```json
[
  { "id": "p1", "alias": "Alice" },
  { "id": "p2", "alias": "Bob" }
]
```

- `GET /api/tournament`
```json
{
  "players": [ { "id": "p1", "alias": "Alice" }, { "id": "p2", "alias": "Bob" } ],
  "schedule": [
    { "p1": "Alice", "p2": "Bob", "status": "pending" }
  ],
  "currentMatchIndex": null
}
```

## Notes
- Frontend remains fully functional without backend (localStorage). When backend is ready, we’ll swap storage calls to fetch/save via these endpoints.
- If a mock server is needed later, we can serve these JSON files with Nginx or a tiny Node script behind `/api`.
