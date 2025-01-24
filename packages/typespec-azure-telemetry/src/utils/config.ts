export function isTelemetryDisabled() {
  // Disable telemetry if we're running in an environment that doesn't have environment variables
  if (typeof process === "undefined" || typeof process.env !== "object") {
    return true;
  }
  return Boolean(process.env.DISABLE_TYPESPEC_AZURE_TELEMETRY);
}
