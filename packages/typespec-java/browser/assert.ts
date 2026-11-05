export function fail(message?: string): never {
  throw new Error(message ?? "Java code-model assertion failed.");
}
