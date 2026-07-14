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
  .using("Http", "Versioning");
