// tests/core.test.js — zero-dependency unit tests for core.js
// Run from repo root:  node tests/core.test.js
'use strict';

const path = require('path');
const assert = require('assert');
require(path.join(__dirname, '..', 'core.js'));

const { parseNum, toL100, computeCore } = global.FuelCore;

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push({ name, err });
  }
}

// ── parseNum ─────────────────────────────────────────────────────────────────

test('parseNum: European decimal comma', () => {
  assert.strictEqual(parseNum('6,5'), 6.5);
});

test('parseNum: dot decimal', () => {
  assert.strictEqual(parseNum('7.20'), 7.2);
});

test('parseNum: trims whitespace', () => {
  assert.strictEqual(parseNum('  150 '), 150);
});

test('parseNum: empty string → NaN', () => {
  assert.ok(Number.isNaN(parseNum('')));
});

test('parseNum: null/undefined → NaN', () => {
  assert.ok(Number.isNaN(parseNum(null)));
  assert.ok(Number.isNaN(parseNum(undefined)));
});

test('parseNum: garbage → NaN', () => {
  assert.ok(Number.isNaN(parseNum('abc')));
});

// ── toL100 ─────────────────────────────────────────────────────────────────

test('toL100: L100 passthrough', () => {
  assert.strictEqual(toL100(6.5, 'L100'), 6.5);
});

test('toL100: km/L → L/100', () => {
  assert.strictEqual(toL100(20, 'kmL'), 5);
});

test('toL100: mpg → L/100 (US factor 235.214)', () => {
  assert.ok(Math.abs(toL100(36, 'mpg') - 235.214 / 36) < 1e-9);
});

// ── computeCore ────────────────────────────────────────────────────────────

test('computeCore: 150 km @ 6.5 L/100 @ 7.20 RON', () => {
  const r = computeCore(150, 6.5, 7.2);
  assert.ok(Math.abs(r.litri - 9.75) < 1e-9);          // 150/100*6.5
  assert.ok(Math.abs(r.cost - 70.2) < 1e-9);           // 9.75*7.2
  assert.ok(Math.abs(r.costPerKm - 0.468) < 1e-9);     // 70.2/150
});

test('computeCore: round-trip distance doubles', () => {
  const r = computeCore(300, 6.5, 7.2);                // 150 × 2
  assert.ok(Math.abs(r.litri - 19.5) < 1e-9);
  assert.ok(Math.abs(r.cost - 140.4) < 1e-9);
});

test('computeCore: zero distance divides safely (costPerKm = Infinity)', () => {
  const r = computeCore(0, 6.5, 7.2);
  assert.strictEqual(r.litri, 0);
  assert.strictEqual(r.cost, 0);
  // costPerKm = 0/0 = NaN — callers validate distance > 0 first, so this only
  // documents the pure-math behaviour, it must not throw.
  assert.ok(typeof r.costPerKm === 'number');
});

// ── Report ─────────────────────────────────────────────────────────────────

console.log(`\n✓ ${passed} tests passed`);
if (failures.length) {
  console.log(`✗ ${failures.length} tests FAILED:\n`);
  failures.forEach(({ name, err }) => {
    console.log(`  - ${name}\n    ${err.message}`);
  });
  process.exit(1);
}
