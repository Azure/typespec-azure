import { createHash, randomUUID } from "node:crypto";
import { networkInterfaces as getNetworkInterfaces } from "node:os";

/**
 * Returns a hash of the machine's MAC address,
 * or a random UUID if the MAC address is not available.
 * @returns
 */
export function getMachineId(): string {
  try {
    const hashedMac = getHashedMac();
    if (hashedMac) {
      return hashedMac;
    }
  } catch {
    // ignore error
  }
  // fallback to uuid
  return randomUUID();
}

function getHashedMac(): string | undefined {
  const macAddress = getMac();
  if (!macAddress) {
    return;
  }

  return createHash("sha256").update(macAddress, "utf8").digest("hex");
}

const invalidMacAddresses = new Set([
  "00:00:00:00:00:00",
  "ff:ff:ff:ff:ff:ff",
  "ac:de:48:00:11:22",
]);

function validateMacAddress(candidate: string): boolean {
  const tempCandidate = candidate.replace(/-/g, ":").toLowerCase();
  return !invalidMacAddresses.has(tempCandidate);
}

function getMac(): string | undefined {
  const networkInterfaces = getNetworkInterfaces();
  for (const name in networkInterfaces) {
    const networkInterface = networkInterfaces[name];
    if (networkInterface) {
      for (const { mac } of networkInterface) {
        if (validateMacAddress(mac)) {
          return mac;
        }
      }
    }
  }
  return;
}
