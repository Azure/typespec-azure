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
  if (client.services.length <= 1) return;

  // For each shared dependency namespace, collect the set of versions picked
  // across all merged services.
  const depVersions = new Map<Namespace, Set<string>>();
  const services = new Set<Namespace>(client.services);

  for (const service of client.services) {
    const resolutions = resolveVersions(context.program, service);
    if (resolutions.length === 0) continue;
    // Use the latest resolved version of this service (matches what TCGC picks).
    for (const [depNs, depVersion] of resolutions[resolutions.length - 1].versions) {
      // Ignore versions of the merged services themselves.
      if (services.has(depNs)) continue;
      const versions = depVersions.get(depNs) ?? new Set<string>();
      versions.add(depVersion.value ?? depVersion.name);
      depVersions.set(depNs, versions);
    }
  }

  // Report any dependency that resolved to more than one version.
  for (const [depNs, versions] of depVersions) {
    if (versions.size <= 1) continue;
    reportDiagnostic(context.program, {
      code: "inconsistent-multiple-service-dependency",
      format: {
        clientName: client.name,
        dependencyName: getNamespaceFullName(depNs),
        versions: [...versions].map((v) => `"${v}"`).join(", "),
      },
      target: client.type ?? client.services[0],
    });
  }
}
