import { resolvePath, type EmitContext } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";

export const MetadataTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-client-generator-core",
  ],
});

export const SimpleTester = MetadataTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
).using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core");

export async function createSdkContextForTester(
  program: any,
  options: Record<string, unknown> = {},
) {
  return createSdkContext(
    {
      program,
      emitterOutputDir: resolveVirtualPath("tsp-output"),
      options,
    } as EmitContext<Record<string, unknown>>,
    "@azure-tools/typespec-python",
  );
}
