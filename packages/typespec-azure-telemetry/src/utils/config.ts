export function isTelemetryDisabled() {
  return Boolean(process.env.DISABLE_TYPESPEC_AZURE_TELEMETRY) || !isCompilerProcess();
}

function isCompilerProcess() {
  const [, command] = process.argv;
  // This is a fragile way to detect if we are running in the compiler process.
  // For now, this ensures that telemetry is not sent when running the tsp service.
  // (e.g. in vscode)
  // Switching to an explicit opt-in, and/or updating the vs/vscode extensions to honor
  // user telemetry settings would be a better long-term solution.
  if (command.endsWith(`tsp.js`)) {
    return true;
  }
  return false;
}
