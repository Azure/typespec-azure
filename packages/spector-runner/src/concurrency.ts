/**
 * Run async tasks over `items` with at most `concurrency` running at a time.
 * Mirrors the scheduler in `@typespec/tsp-integration` so the engines stay
 * aligned. Results are returned in completion order (not input order).
 *
 * If any `processor` call rejects, the returned promise rejects; provide a
 * processor that never throws (capture failures in its result) when you want
 * every item to run to completion.
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const toRun = [...items];
  const results: R[] = [];
  let completed = 0;
  let running = 0;

  return new Promise((resolve, reject) => {
    function runNext(): void {
      if (toRun.length === 0 || running >= concurrency) {
        return;
      }

      const item = toRun.shift()!;
      running++;
      processor(item)
        .then((result) => {
          results.push(result);
          completed++;
          running--;

          if (completed === items.length) {
            resolve(results);
            return;
          }

          runNext();
        })
        .catch(reject);
    }

    for (let i = 0; i < Math.min(concurrency, toRun.length); i++) {
      runNext();
    }
  });
}
