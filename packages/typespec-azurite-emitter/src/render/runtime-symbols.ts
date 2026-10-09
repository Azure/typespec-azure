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
