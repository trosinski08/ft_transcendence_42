# Mock API for Frontend Integration

See the monorepo backend mock implementation in `../ft_transendence42/backend/src/index.js` (branch `feature/backend-mock`).

- Run backend: `npm install && node src/index.js` in `ft_transendence42/backend`
- Run frontend: `npm run dev` in `ft_transcendence_frontend_repo`
- Endpoints: `/api/health`, `/api/players`, `/api/tournament` (proxied by webpack devServer to `http://localhost:8000`)

For full details, see the backend repo README (to be added) or inline docs in the server file.
