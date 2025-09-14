# Frontend (ft_transcendence)

Clean, staged history for the Pong frontend.

## Local development

```bash
npm install
npm run start
```

Dev server runs on `http://localhost:3000`.

## Build

```bash
npm run build
```

## Type checking

```bash
npm run typecheck
```

## Pixel font

```bash
./scripts/download_pixel_font.sh
```

Downloads `src/assets/pixel-font.woff2` which the CSS uses if present.


## Production (HTTPS) via Docker Compose

Build and run with HTTPS (self-signed cert):

```bash
cd nginx/ssl && ./generate-cert.sh && cd -
docker-compose up --build
```

- Open: `https://localhost:8443` (you may need to accept the self-signed certificate).
- HTTP `http://localhost:8080` redirects to HTTPS.

Notes:
- Docker must be available in your environment. If using WSL, enable Docker Desktop WSL 2 integration.
- This setup provides SPA history fallback and prepares for `wss`.

