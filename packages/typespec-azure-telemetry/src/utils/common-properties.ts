import { randomUUID } from "node:crypto";
import { arch, platform, release } from "node:os";

export function getCommonProperties() {
  return {
    sessionId: randomUUID(),
    "host.arch": arch(),
    "os.type": platform(),
    "os.version": release(),
    "telemetry.sdk.name": "typespec-azure-telemetry",
    "telemetry.sdk.language": "javascript",
  };
}
