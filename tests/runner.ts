import * as aiTest from './ai.simpleAI.test';
import * as i18nTest from './i18n.test';
import * as sanitizeTest from './sanitize.test';
import * as validationTest from './validation.test';

const suites = [
  { name: 'ai.simpleAI', mod: aiTest },
  { name: 'i18n', mod: i18nTest },
  { name: 'sanitize', mod: sanitizeTest },
  { name: 'validation', mod: validationTest },
];

let passed = 0;
let failed = 0;

for (const suite of suites) {
  suite.mod.run((cond: any, msg?: string) => {
    if (cond) {
      console.log(`  ✓ ${suite.name}: ${msg ?? ''}`);
      passed++;
    } else {
      console.error(`  ✗ ${suite.name}: ${msg ?? '(no message)'}`);
      failed++;
    }
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
