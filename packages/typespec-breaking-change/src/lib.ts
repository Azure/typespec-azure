import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-breaking-change",
  diagnostics: {
    "breaking-change": {
      severity: "error",
      messages: {
        default: paramMessage`Breaking change detected: ${"message"}`,
      },
    },
  },
} as const);

export const { reportDiagnostic } = $lib;
export { BreakingChangeStateKeys } from "@azure-tools/typespec-azure-core";
