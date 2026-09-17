/** Substitute the `{api-version}` placeholder with a concrete version when materializing. */
export function substituteApiVersion<T>(value: T, apiVersion: string): T {
  return substitute(value, apiVersion) as T;
}

function substitute(value: unknown, apiVersion: string): unknown {
  if (typeof value === "string") {
    return value.split("{api-version}").join(apiVersion);
  }
  if (Array.isArray(value)) {
    return value.map((item) => substitute(item, apiVersion));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = substitute(item, apiVersion);
    }
    return out;
  }
  return value;
}
