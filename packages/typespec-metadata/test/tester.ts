import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const ApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-metadata",
  ],
});

export const MetadataTester = ApiTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-azure-core",
  "@azure-tools/typespec-client-generator-core",
).using("Http", "Rest", "Versioning", "Azure.Core", "Azure.ClientGenerator.Core");

export const EmitterTester = MetadataTester.emit("@azure-tools/typespec-metadata", {});
