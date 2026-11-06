#!/usr/bin/env node
/**
 * Runs the whole Vitest suite once per timezone, each in its own process with
 * TZ set before Node starts, so timezone behaviour is deterministic.
 *
 *   npm test                         → all zones
 *   npm test -- --zones=UTC,Asia/Kolkata
 *   npm test -- tests/dates          → extra args are passed to Vitest
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland']

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vitestBin = path.join(root, 'node_modules', 'vitest', 'vitest.mjs')

const args = process.argv.slice(2)
const zonesArg = args.find((a) => a.startsWith('--zones='))
const zones = zonesArg ? zonesArg.slice('--zones='.length).split(',').filter(Boolean) : TIMEZONES
const passthrough = args.filter((a) => !a.startsWith('--zones='))

const countsDir = mkdtempSync(path.join(os.tmpdir(), 'kaizen-tests-'))
const reporterArgs = ['--reporter=default', `--reporter=${path.join(root, 'tests', 'support', 'countsReporter.js')}`]

const results = []
for (const [i, tz] of zones.entries()) {
  console.log(`\n━━━━ TZ=${tz} ━━━━`)
  const countsFile = path.join(countsDir, `${i}.json`)
  const run = spawnSync(process.execPath, [vitestBin, 'run', ...reporterArgs, ...passthrough], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TZ: tz, KAIZEN_TEST_COUNTS: countsFile },
  })
  let counts = null
  try {
    counts = JSON.parse(readFileSync(countsFile, 'utf8'))
  } catch {
    // run crashed before reporting
  }
  results.push({ tz, ok: run.status === 0, counts })
}
rmSync(countsDir, { recursive: true, force: true })

const pad = (v, n) => String(v).padStart(n)
console.log('\nTimezone matrix:')
console.log('  result  zone                   passed  expected-fail  failed  skipped  todo  total')
for (const { tz, ok, counts: c } of results) {
  const cols = c
    ? `${pad(c.passed, 6)}  ${pad(c.expectedFailures, 13)}  ${pad(c.failed, 6)}  ${pad(c.skipped, 7)}  ${pad(c.todo, 4)}  ${pad(c.total, 5)}`
    : '  (no counts: run did not finish)'
  console.log(`  ${ok ? 'PASS' : 'FAIL'}    ${tz.padEnd(21)}  ${cols}`)
}
const names = [...new Set(results.flatMap((r) => r.counts?.expectedFailureNames ?? []))]
if (names.length) {
  console.log('\nExpected failures (it.fails, known defects not yet fixed):')
  for (const n of names) console.log(`  - ${n}`)
}
process.exit(results.every((r) => r.ok) ? 0 : 1)
