# CI Setup

## Pipeline Stages
1. Install dependencies (cache node_modules)
2. Lint (ESLint)
3. Typecheck (tsc --noEmit)
4. Build (webpack / Vite)
5. Test (placeholder, add when tests ready)
6. Security / audit (npm audit --production)
7. Docker build & tag
8. (Optional) Push to registry & deploy

## Example GitHub Actions Workflow
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install deps
        run: npm ci
      - name: Lint
        run: npx eslint . --max-warnings=0 || true
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Build
        run: npm run build
      - name: Audit (non-blocking)
        continue-on-error: true
        run: npm audit --production
      - name: Docker build
        run: docker build -t ft_transcendence:ci .
```

## Local Verification
```bash
npm ci
npx eslint .
npx tsc --noEmit
npm run build
```

## Notes
- Add test stage once unit/integration tests exist.
- Consider Trivy or Grype for container vulnerability scanning.
