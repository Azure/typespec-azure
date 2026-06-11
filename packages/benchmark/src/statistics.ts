export interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  cv: number;
  min: number;
  max: number;
  sampleCount: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  if (avg === 0) return 0;
  return stdDev(values) / avg;
}

export function summarize(values: number[]): DistributionStats {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      cv: 0,
      min: 0,
      max: 0,
      sampleCount: 0,
    };
  }

  return {
    mean: mean(values),
    median: median(values),
    stdDev: stdDev(values),
    cv: coefficientOfVariation(values),
    min: Math.min(...values),
    max: Math.max(...values),
    sampleCount: values.length,
  };
}
