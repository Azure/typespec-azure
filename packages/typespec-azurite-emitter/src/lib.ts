import { createTypeSpecLibrary } from "@typespec/compiler";
import { azuritePilotEmitterOptionsSchema } from "./options.js";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azurite-emitter",
  diagnostics: {
    "no-service-found": {
      severity: "warning",
      messages: {
        default:
          "No HTTP service was found in the compiled program. An empty artifact set will be produced.",
      },
    },
  },
  emitter: {
    options: azuritePilotEmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
