# Frontend (ft_transcendence)

Clean, staged history for the Pong frontend with SPA routing, AI opponent, and HTTPS via Nginx + Docker.

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

## Gameplay Controls

- **Player 1 (Left Paddle)**: W (up), S (down)
- **Player 2 (Right Paddle)**: Arrow Up (up), Arrow Down (down)
- **Start/Pause**: Spacebar
- **Reset Match**: R key (after game end)

Gameplay rules:
- First to 11 points wins.
- Ball accelerates on paddle hits (up to max speed cap).
- Paddles move at uniform speed for fairness.

## Tournament Flow

1. **Register Players**: Go to `/register`, enter aliases (2-20 chars, A-Z a-z 0-9 _ - , unique case-insensitive).
2. **Start Tournament**: Click "Start Next Match" to begin scheduled matches.
3. **Play Matches**: Matches are paired sequentially from registered players.
4. **View Schedule/Bracket**: See upcoming and completed matches in the header.
5. **Reset Tournament**: Click "New Tournament" to clear all data and start over.

## Routing

- Single-Page Application with History API support.
- Routes: `/` (home), `/register`, `/tournament`, `/game`.
- Back/Forward buttons work; direct URL reloads hydrate the correct view.
- Unknown paths fallback to home.

## Alias Validation Rules

- Required, non-empty.
- 2-20 characters.
- Allowed: A-Z, a-z, 0-9, underscore (_), hyphen (-).
- No spaces (collapsed to single space and trimmed).
- Case-insensitive uniqueness (e.g., "Player" and "player" conflict).
- Sanitized: multiple whitespace collapsed, trimmed.

## AI Opponent

- Toggle in Game page: checkbox "AI Opponent" or press `A`.
- Difficulty: `EASY`, `NORMAL`, `HARD` selector.
- Persistence: Settings (toggle + difficulty) stored in `localStorage` and restored on reload.
- URL flags (optional): `?ai=1` and `?aiDifficulty=EASY|NORMAL|HARD`.
- Fairness: AI uses same paddle speed limits as human players.

## Production (HTTPS) via Docker Compose

Build and run with HTTPS (self-signed cert):

```bash
cd nginx/ssl && ./generate-cert.sh && cd -
sudo docker-compose down -v
sudo docker-compose up --build -d
```

- Open: `https://localhost:8443` (accept the self-signed certificate if prompted).
- Deep links supported: e.g., `https://localhost:8443/game`.
- HTTP `http://localhost:8080` redirects to HTTPS.
- SPA fallback: unknown paths serve `index.html` for client-side routing.

Notes:
- Docker must be available in your environment. If using WSL, enable Docker Desktop WSL 2 integration.
- This setup provides SPA history fallback and prepares for `wss`.
- Production build is served by Nginx with TLS, caching headers, and gzip.

## Browser Support

- Tested on Chrome and Firefox (latest versions).
- Uses standard APIs: Canvas 2D, requestAnimationFrame, localStorage, History API.
- Keyboard events use `e.code` for cross-browser compatibility.

