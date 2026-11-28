import * as ts from "@alloy-js/typescript";

const runtimeExports = [
  "createSerializationRuntime",
  "defineOperation",
  "defineServiceMetadata",
  "defineXmlModel",
  "OperationMetadata",
  "ServiceMetadata",
] as const;

export type RuntimeSymbols = ReturnType<typeof createRuntimeSymbols>;

/** Registers the Azurite-owned module's exports for Alloy reference resolution.
 * The synthetic package version is not a dependency or a descriptor format version.
 */
export function createRuntimeSymbols(runtimeImport: string) {
  return ts.createPackage({
    name: runtimeImport,
    version: "0.0.0",
    descriptor: {
      ".": {
        named: [...runtimeExports],
      },
    },
  });
}
