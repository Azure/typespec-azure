import { getNamespaceFullName, Namespace } from "@typespec/compiler";
import { resolveVersions } from "@typespec/versioning";
import { listClients } from "../decorators.js";
import { SdkClient, TCGCContext } from "../interfaces.js";
import { reportDiagnostic } from "../lib.js";

export function validateClients(context: TCGCContext) {
  for (const client of listClients(context)) {
    validateMultipleServiceDependencyVersions(context, client);
  }
}

/**
 * For clients merging multiple services, ensure all services agree on the
 * version of any shared library dependency (e.g. ARM common-types). Diverging
 * versions cause TCGC to emit duplicated/diverged models in the generated SDK.
 */
function validateMultipleServiceDependencyVersions(context: TCGCContext, client: SdkClient): void {
  if (client.services.length <= 1) {
    return;
  }

  const serviceSet = new Set<Namespace>(client.services);
  // dependency namespace -> version value -> services declaring it at that version
  const depVersions = new Map<Namespace, Map<string, Namespace[]>>();

  for (const service of client.services) {
    const resolutions = resolveVersions(context.program, service);
    if (resolutions.length === 0) continue;
    // Use the latest resolved version of this service (matches TCGC's pick).
    const latest = resolutions[resolutions.length - 1];
    for (const [depNs, depVersion] of latest.versions) {
      // Skip the service itself and any other services merged into the client.
      if (serviceSet.has(depNs)) continue;
      const versionValue = depVersion.value ?? depVersion.name;
      let perVersion = depVersions.get(depNs);
      if (perVersion === undefined) {
        perVersion = new Map<string, Namespace[]>();
        depVersions.set(depNs, perVersion);
      }
      const owners = perVersion.get(versionValue) ?? [];
      owners.push(service);
      perVersion.set(versionValue, owners);
    }
  }

  for (const [depNs, perVersion] of depVersions) {
    if (perVersion.size <= 1) continue;
    const parts: string[] = [];
    for (const [version, services] of perVersion) {
      const serviceNames = services.map((s) => getNamespaceFullName(s)).join(", ");
      parts.push(`"${version}" (used by ${serviceNames})`);
    }
    reportDiagnostic(context.program, {
      code: "inconsistent-multiple-service-dependency",
      format: {
        clientName: client.name,
        dependencyName: getNamespaceFullName(depNs),
        versions: parts.join("; "),
      },
      target: client.type ?? client.services[0],
    });
  }
}
