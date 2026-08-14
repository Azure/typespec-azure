import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "tsp-lintdiff-local-linter",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "TypeSpec.Versioning", "Azure.ResourceManager");
