# ft_transcendence – Business Overview

## Value proposition
- Real-time Pong experience with tournaments, AI opponent, and retro aesthetics
- Multiplayer-ready foundation with bracketed tournaments and stats
- Simple deployment via Docker; observability hooks for ELK/Grafana

## Who is it for?
- Small teams or hackathon projects needing a fun, demonstrable product
- Students showcasing full‑stack skills (TS SPA, NestJS API, DB, Docker)
- Employers evaluating code quality, UX polish, and delivery practices

## Architecture (high level)
- Frontend: TypeScript SPA, Canvas rendering, Tailwind CSS utilities
- State: Local state + API sync wrappers; tournament bracket planner
- AI: Simple parametric paddle AI with difficulty presets
- Backend (intended): NestJS + PostgreSQL, REST/JSON
- Observability: ELK stack (structured logs) and Grafana-ready metrics
- Deployment: docker-compose with app and optional ELK stack

## Key differentiators
- Tournament bracket auto-generation with byes and auto-advance
- Clean pause/reset and fair scoring; optional power-ups and effects
- I18n-ready UI (EN/PL/DE) with accessibility enhancements
- Modular code: physics, AI, rendering, state, routing, tournament

## Current feature snapshot
- Play modes: Local 1v1, Tournament (scheduled matches)
- AI: Easy/Normal/Hard presets; reactive target prediction
- UI: Retro theme, Tailwind utilities, keyboard accessibility, i18n
- Stats: Top players leaderboard, recent matches

## Roadmap highlights
- Achievements system and performance HUD
- Spectator and matchmaking polish
- Adaptive AI and analytics dashboards
- OAuth 42, 2FA, chat/social graph (subject requirements)

## Risks and mitigations
- Backend gaps (auth, security) → add DTO validation, guards, hashing, rate limits
- Observability gaps → structured logs + basic metrics emitted from FE/BE
- UI debt → Tailwind utility pass and componentization

## How to demo
- Register a few players and build a bracket; play through matches
- Toggle AI to show human vs AI matches
- Check Stats page for top players and recent matches

## License and attribution
- Intended for educational/demonstration use. Verify asset licenses (fonts/images) before production.
