import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@azure-tools/typespec-azure-portal-core",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@typespec/rest",
    "@typespec/http",
    "@typespec/versioning",
  ],
})
  .importLibraries()
  .using("Azure.Portal", "Azure.ResourceManager", "Versioning");
