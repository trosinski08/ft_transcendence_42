#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (res.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(res.status || 1);
  }
}

// 1) compile tests + src to .tmp-test
run('npx', ['tsc', '-p', 'tsconfig.tests.json']);

// 2) run each compiled test
const testDir = path.resolve('.tmp-test/tests');
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

if (!fs.existsSync(testDir)) {
  console.error('No compiled tests found at', testDir);
  process.exit(1);
}

const files = fs.readdirSync(testDir).filter(f => f.endsWith('.js'));
for (const f of files) {
  const mod = require(path.join(testDir, f));
  if (typeof mod.run !== 'function') {
    console.warn('Skipping (no run):', f);
    continue;
  }
  try {
    mod.run(assert);
    console.log(`✔ ${f}`);
    passed++;
  } catch (e) {
    console.error(`✘ ${f}:`, e && e.message ? e.message : e);
    failed++;
  }
}

console.log(`\nTest summary: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
