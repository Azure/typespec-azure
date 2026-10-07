import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";
import { azuritePilotEmitterOptionsSchema } from "./options.js";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azurite-emitter",
  diagnostics: {
    "no-service-found": {
      severity: "error",
      messages: {
        default:
          "No HTTP service was found in the compiled program. The Azurite emitter requires exactly one HTTP service.",
      },
    },
    "multiple-services": {
      severity: "error",
      messages: {
        default:
          "Multiple HTTP services were found in the compiled program. The Azurite emitter requires exactly one HTTP service.",
      },
    },
    "unsupported-type": {
      severity: "error",
      messages: {
        default: paramMessage`Unsupported TypeSpec wire type: ${"message"}`,
      },
    },
    "skipped-operation": {
      severity: "error",
      messages: {
        default: paramMessage`Operation ${"name"} could not be emitted: ${"reason"}`,
      },
    },
  },
  emitter: {
    options: azuritePilotEmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
