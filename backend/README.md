# ft-transcendence backend (mock)

Minimal Fastify-based mock API used for local frontend integration. Mirrors the endpoints the frontend calls and can be swapped with the real backend.

## Quick start (no Docker)

```bash
# Inside ft_transendence42/backend
npm install
node src/index.js
```

- Server listens on http://localhost:8000
- Endpoints:
  - GET /api/health → { status: 'ok', ts }
  - GET /api/players → [{ id, alias }, ...]
  - GET /api/tournament → { players, schedule, currentMatchIndex }
  - POST /api/log → { ok: true } (logs req.body)

## Frontend dev integration

In the frontend repo (`ft_transcendence_frontend_repo`), the dev server proxies `/api/*` to `http://localhost:8000`.

```bash
# In ft_transcendence_frontend_repo
npm run dev
# open http://localhost:3000
```

## Compose (when Docker available)

`docker-compose.yml` in repo root defines `frontend`, `backend`, `nginx`. Nginx proxies:
- `/` → frontend:3000
- `/api/` → backend:8000

Start the stack:
```bash
docker compose up --build
```

## Notes

- Mock data is in-memory only (no persistence).
- Dependencies intentionally minimal: `fastify`, `@fastify/cors`.
- Real backend can replace this by keeping the same endpoint shapes or by adapting the frontend client.
