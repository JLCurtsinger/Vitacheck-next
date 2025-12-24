import "server-only"

/**
 * Simple concurrency limiter using pLimit pattern.
 * No external dependencies - pure Promise-based implementation.
 */

interface QueuedTask<T> {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

export function createLimiter(concurrency: number) {
  let active = 0
  const queue: QueuedTask<any>[] = []

  function processQueue() {
    if (active >= concurrency || queue.length === 0) {
      return
    }

    const task = queue.shift()
    if (!task) return

    active++
    Promise.resolve(task.fn())
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        active--
        processQueue()
      })
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      processQueue()
    })
  }
}

