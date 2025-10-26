# Frontend Subject Compliance (mapping -> code)

This document maps the subject’s mandatory frontend requirements to the codebase. Each item lists file paths and line references, plus a brief description of the implementation.

Note: Line numbers refer to the current `frontend` branch state at the time of writing.

## Mandatory frontend requirements

1) Single-Page Application with History API
- Files: `src/routing/router.ts` lines ~1–83 (showRoute), 85–107 (navigateTo, initRouter)
- Description: Client router toggles page sections, updates history via `pushState/replaceState`, and listens for `popstate` to enable back/forward navigation and deep-linking.

2) Frontend in TypeScript
- Files: `tsconfig.json` lines 1–15; `package.json` lines 6–11 (scripts), 12–26 (dev deps)
- Description: TypeScript configuration targets ES2018 with DOM lib; scripts include `typecheck`, and `typescript` is a dev dependency.

3) Game (Pong) – canvas loop, inputs, collisions, scoring
- Files: `src/game/physics/physics.ts` lines ~1–53 (ball/reset and collision), ~55–93 (paddle bounce and scoring)
- Description: Physics module updates ball each frame, applies wall and paddle bounces with angle from hit position, and reports scoring when the ball edge crosses bounds.

4) Two players on same keyboard (identical paddle speed)
- Files: `src/game/input.ts` lines ~1–23 (key handlers); `src/game/constants.ts` defines uniform `PADDLE.SPEED`
- Description: `W/S` control left paddle, `↑/↓` control right; input module updates a keys set read by the game loop; both paddles use the same configured speed.

5) Tournament: registration, matchmaking, schedule, next match
- Files: `src/tournament/tournament.ts` lines ~47–73 (renderSchedule), 75–92 (renderBracket), 94–127 (renderStatsPage), 129–151 (startNextScheduledMatch), 153–209 (initTournamentBindings form submit), 211–240 (start/new actions)
- Description: Users register aliases (validated/sanitized), schedule is built from registrations and rendered with statuses, and the next match hydrates current players and navigates to the game.

6) Registration validation and sanitization
- Files: `src/utils/validation.ts` all (regex and helpers); `src/tournament/tournament.ts` lines ~158–176 (validate + error messages)
- Description: Aliases are validated against `^[A-Za-z0-9_\-]{2,20}$`, duplicates are rejected case-insensitively, and input is sanitized (collapse whitespace, strip angle brackets/control chars).

7) Persistence (localStorage) and recovery
- Files: `src/state/gameState.ts` lines ~15–49 (loadState), 51–65 (saveState)
- Description: Players, queue, and stats are stored and reloaded from localStorage; remote `/api/players` is attempted first for hydration.

8) Stats and match history
- Files: `src/state/gameState.ts` lines ~3–13 (types), 67–99 (stats ops), 101–127 (recordMatch)
- Description: Per-player wins/losses/streak/rating tracked; `recordMatch` pushes match entries, updates Elo-like rating, persists, and marks schedule entry complete.

9) i18n – translations and DOM application
- Files: `src/i18n/translations.ts` (messages, `t()`, `applyTranslations()`); usage throughout UI with `data-i18n` in `src/index.html`.
- Description: Small i18n layer translates keys to PL/EN/DE, supports variable interpolation and applies texts to DOM nodes.

10) Optional remote API integration
- Files: `src/apiClient.ts` (safe `fetchPlayers` with graceful fallback)
- Description: Attempts `/api/players` for hydration; falls back to local storage on network failure.

11) HTTPS containerized production run
- Files: `docker-compose.yml` lines 1–10; `nginx/nginx.conf` lines 1–51
- Description: Production compose serves the build via Nginx on 9443->443 with TLS and SPA fallback, plus strict security headers (HSTS, XFO, CSP, etc.).

12) Customization options (minor module)
- Files: Settings inputs in `src/index.html` and bindings in code (settings UI helpers module); power-up toggles and intervals are persisted and applied at runtime.
- Description: Users can tweak win score, paddle/ball parameters, power-ups, and theme; changes persist and are applied without reload.

---

If you need fine-grained line anchors for a specific function/module, I can expand this document with nl-annotated snippets.
