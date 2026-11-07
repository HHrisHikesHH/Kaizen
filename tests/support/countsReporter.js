/**
 * Vitest reporter that writes exact outcome counts to $KAIZEN_TEST_COUNTS.
 * Expected failures (it.fails) are counted on their own so they are never
 * hidden inside the "passed" total, which is how Vitest reports them.
 */
import { writeFileSync } from 'node:fs'

export default class CountsReporter {
  onTestRunEnd(testModules) {
    const out = process.env.KAIZEN_TEST_COUNTS
    if (!out) return
    const counts = { passed: 0, expectedFailures: 0, failed: 0, skipped: 0, todo: 0, total: 0 }
    const expectedFailures = []
    for (const mod of testModules) {
      for (const test of mod.children.allTests()) {
        counts.total++
        const { state } = test.result()
        if (test.options.mode === 'todo') counts.todo++
        else if (state === 'skipped' || state === 'pending') counts.skipped++
        else if (state === 'failed') counts.failed++
        else if (test.options.fails) {
          counts.expectedFailures++
          expectedFailures.push(test.fullName)
        } else counts.passed++
      }
    }
    writeFileSync(out, JSON.stringify({ ...counts, expectedFailureNames: expectedFailures }))
  }
}
