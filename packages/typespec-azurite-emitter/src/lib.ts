import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";
import { azuriteEmitterOptionsSchema } from "./options.js";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azurite-emitter",
  state: { optional: { description: "Properties made optional by an Azurite overlay." } },
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
    "no-operations": {
      severity: "error",
      messages: {
        default: "The HTTP service has no operations to emit.",
      },
    },
    "operation-name-collision": {
      severity: "error",
      messages: {
        default: paramMessage`Operation name collision for ${"name"}: ${"reason"}`,
      },
    },
  },
  emitter: {
    options: azuriteEmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
