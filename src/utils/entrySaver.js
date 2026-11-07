/**
 * Saves the daily entry: debounced autosave plus an immediate flush, with all
 * writes run one at a time in the order they were requested.
 *
 * Serializing matters because each save rewrites the whole file: if an older
 * debounced write finished after a newer one, the file would go back to the
 * older content (e.g. lose sessionComplete).
 */
export function createEntrySaver(write, { delayMs = 150 } = {}) {
  let timer = null
  let pending = null
  let queue = Promise.resolve(true)

  function enqueue(entry) {
    const run = queue.then(() => write(entry))
    queue = run.catch(() => false)
    return run.then(Boolean, () => false)
  }

  return {
    /** Save after `delayMs` of quiet; later calls replace the pending entry. */
    schedule(entry) {
      pending = entry
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const next = pending
        pending = null
        enqueue(next)
      }, delayMs)
    },

    /**
     * Save `entry` now, replacing any pending autosave, after writes already
     * in progress. Resolves true once this entry is on disk, false on failure.
     */
    flush(entry) {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
      return enqueue(entry)
    },

    /** Resolves when every requested write has finished. */
    idle() {
      return queue.then(() => undefined)
    },

    /** Drop a pending autosave without writing it. */
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
    },
  }
}
