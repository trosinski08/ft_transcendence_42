#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) process.exit(res.status || 1);
}

// Compile tests and src for testing
run('npx', ['tsc', '-p', 'tsconfig.tests.json']);

let passed = 0, failed = 0;
const testDir = path.join(process.cwd(), '.tmp-test', 'tests');
if (!fs.existsSync(testDir)) {
  console.error('No compiled tests found at', testDir);
  process.exit(1);
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'Assertion failed'); };

const files = fs.readdirSync(testDir).filter(f => f.endsWith('.js'));
(async () => {
  for (const f of files) {
    const mod = require(path.join(testDir, f));
    if (typeof mod.run !== 'function') {
      console.warn('Skipping (no run):', f);
      continue;
    }
    try {
      const maybePromise = mod.run(assert);
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
      console.log(`✔ ${f}`);
      passed++;
    } catch (e) {
      console.error(`✘ ${f}:`, e && e.message ? e.message : e);
      failed++;
    }
  }
  console.log(`\nTest summary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
