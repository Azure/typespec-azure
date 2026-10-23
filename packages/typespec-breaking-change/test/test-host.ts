import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: ["@typespec/http", "@typespec/versioning"],
})
  .importLibraries()
  .using("Http", "Versioning");

export const TesterWithSuppressions = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
  ],
})
  .importLibraries()
  .using("Http", "Versioning", "Azure.Core");

export const TesterWithArm = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("Http", "Rest", "Versioning", "Azure.Core", "Azure.ResourceManager");
