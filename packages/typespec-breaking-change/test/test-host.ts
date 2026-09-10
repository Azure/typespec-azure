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
    "@typespec/versioning",
    "@azure-tools/typespec-breaking-change",
  ],
})
  .importLibraries()
  .using("Http", "Versioning", "Azure.BreakingChange");

export const TesterWithArm = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-breaking-change",
  ],
})
  .importLibraries()
  .using(
    "Http",
    "Rest",
    "Versioning",
    "Azure.Core",
    "Azure.ResourceManager",
    "Azure.BreakingChange",
  );
