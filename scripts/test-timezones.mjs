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
import path from 'node:path'

export const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland']

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vitestBin = path.join(root, 'node_modules', 'vitest', 'vitest.mjs')

const args = process.argv.slice(2)
const zonesArg = args.find((a) => a.startsWith('--zones='))
const zones = zonesArg ? zonesArg.slice('--zones='.length).split(',').filter(Boolean) : TIMEZONES
const passthrough = args.filter((a) => !a.startsWith('--zones='))

const results = []
for (const tz of zones) {
  console.log(`\n━━━━ TZ=${tz} ━━━━`)
  const run = spawnSync(process.execPath, [vitestBin, 'run', ...passthrough], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TZ: tz },
  })
  results.push({ tz, ok: run.status === 0 })
}

console.log('\nTimezone matrix:')
for (const { tz, ok } of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${tz}`)
process.exit(results.every((r) => r.ok) ? 0 : 1)
