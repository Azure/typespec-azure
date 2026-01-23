import { createTypeSpecLibrary } from "@typespec/compiler";
import { metadataEmitterOptionsSchema } from "./options.js";

export const $lib = createTypeSpecLibrary({
  name: "typespec-metadata",
  diagnostics: {
    "no-types-found": {
      severity: "warning",
      messages: {
        default:
          "The metadata emitter didn't find any TypeSpec declarations defined in the current project. An empty snapshot will be produced.",
      },
    },
  },
  emitter: {
    options: metadataEmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
