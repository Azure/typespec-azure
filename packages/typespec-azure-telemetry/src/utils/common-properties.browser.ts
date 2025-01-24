export function getCommonProperties() {
  return {
    sessionId: getRandomUUID(),
    "telemetry.sdk.name": "typespec-azure-telemetry",
    "telemetry.sdk.language": "javascript",
  };
}

function getRandomUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore error
  }
  return;
}
