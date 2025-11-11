# Roadmap

## Epics

1. Achievements
   - Define unlockable badges (First Win, Clean Sheet, Comeback, Streak, Speedster)
   - FE hook to track events; backend persistence table
   - UI: achievements panel and toasts

2. Spectator Mode
   - Read-only route with live match state
   - Minimal websocket or polling for updates
   - Spectator chat overlay (moderation hooks)

3. Adaptive AI
   - Adjust reaction/noise by player skill and score delta
   - Track rolling performance to tune difficulty mid‑match

4. Analytics & Observability
   - FE metrics emitter (FPS, frame drops, input latency)
   - BE metrics (request rate, latency, error ratio)
   - Dashboards in Grafana; alerts for regressions

5. Monetization (optional)
   - Cosmetic themes and nameplates
   - Non‑intrusive ads or sponsorship slots

## Near-term tasks
- Normalized schedule helpers in state and backend alignment
- Performance HUD stub and toggle
- Tournament winner persistence finalization
- Tailwind utility sweep of key UI elements

## Risks
- Timeboxing observability; avoid gold‑plating
- Balancing AI difficulty with fairness

## Notes
Keep PRs small, write short tests for public functions, and keep the demo path smooth.
