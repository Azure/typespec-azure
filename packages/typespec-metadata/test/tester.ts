import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const MetadataTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-metadata",
  ],
});

export const SimpleTester = MetadataTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
).using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core");
