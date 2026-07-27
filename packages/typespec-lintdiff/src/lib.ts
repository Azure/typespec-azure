import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "tsp-lintdiff-local-linter",
  diagnostics: {},
});
