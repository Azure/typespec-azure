export function supportsFetch() {
  return typeof globalThis.fetch === "function";
}
