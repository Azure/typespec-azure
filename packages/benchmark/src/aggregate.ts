/**
 * Aggregate timing samples with outlier resistance.
 * - 5+ samples: 20% trimmed mean (drop lowest and highest sample)
 * - 1-4 samples: median
 */
export function aggregateDurations(values: number[]): number {
  if (values.length === 0) {
    throw new Error("No values to aggregate");
  }

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length >= 5) {
    const trimmed = sorted.slice(1, -1);
    return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
  }

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

