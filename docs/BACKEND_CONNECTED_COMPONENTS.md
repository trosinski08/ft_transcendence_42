Backend-connected components summary

This repository contains a mock backend (Fastify) under `backend/` and a frontend that can optionally consume its API via `src/apiClient.ts`. This document summarizes the integration points, data shapes, and how to run both ends.

Integration points (frontend ↔ backend)

- Endpoints exposed by backend (Fastify):
  - GET `/api/health` → `{ status: 'ok', ts: number }`
  - GET `/api/players` → `Array<{ id: string; alias: string }>`
  - GET `/api/tournament` → `{ players: Player[]; schedule: Array<{ p1: string; p2: string; status: 'pending'|'playing'|'done' }>; currentMatchIndex: number|null }`
  - POST `/api/log` → `{ ok: true }` (accepts arbitrary JSON payload)

- Frontend client usage:
  - `src/apiClient.ts`
    - `fetchPlayers(): Promise<RemotePlayer[] | null>`
    - `fetchTournament(): Promise<RemoteTournament | null>`
    - Internally uses `safeGet` with `fetch` and returns `null` on network/HTTP errors.

Where used in UI

- The frontend can populate players/initial schedule from the backend when available, falling back to local state otherwise. The API client is designed to be non-invasive: failures return `null` and do not throw, so the UI remains functional offline.

Run the backend locally

- Prereqs: Node 18+ recommended.
- From the repo root:
  - `cd backend`
  - `npm install`
  - `npm run dev` (or `npm start`)
  - Server listens on `http://localhost:8000` by default and serves `/api/*` routes.

Run the frontend (with backend)

- Start the frontend dev server as usual (see root README). Configure your dev proxy or nginx to forward `/api/*` to `http://localhost:8000` if needed.

Tests for backend-connected components

- A lightweight test harness compiles TypeScript and runs tests from `tests/`.
- The test `tests/apiClient.test.ts` mocks `fetch` to validate both success and failure flows in `src/apiClient.ts`.
- Run: `node scripts/run-tests.js` (this will compile via `tsconfig.tests.json` and run the compiled tests).

Notes

- The backend is intentionally simple (mock data) to validate the contract and wiring. You can extend routes, add auth, and back them with a persistent store without changing the frontend integration surface.
