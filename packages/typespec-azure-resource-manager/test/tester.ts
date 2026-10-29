import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const CompilerTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [],
});

export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("Http", "Rest", "Versioning", "Azure.ResourceManager");
