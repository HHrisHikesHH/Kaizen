import { defineConfig } from 'vitest/config'

// Timezone determinism:
// The timezone is fixed per *process*. `npm test` (scripts/test-timezones.mjs)
// launches one Vitest process per zone with TZ set in its environment before
// Node starts. When Vitest is run directly without TZ, default to UTC here so
// the forked workers (which inherit this environment at spawn time) are still
// deterministic. tests/setup/timezone.js verifies the zone in every worker.
if (!process.env.TZ) process.env.TZ = 'UTC'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    pool: 'forks',
    setupFiles: ['tests/setup/timezone.js'],
  },
})
