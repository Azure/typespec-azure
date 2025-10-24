import { Program, resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { createSdkContext, CreateSdkContextOptions } from "../src/context.js";
import { BrandedSdkEmitterOptionsInterface } from "../src/internal-utils.js";

export interface SdkTesterOptions extends BrandedSdkEmitterOptionsInterface {
  emitterName?: string;
}

export const TcgcTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-client-generator-core",
  ],
});

export const SimpleTester = TcgcTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
).using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core");

export const SimpleTesterWithBuiltInService = SimpleTester.wrap(
  (x) => `
@service
namespace TestService;

${x}
`,
);

export function createSdkContextForTester(
  program: Program,
  options: SdkTesterOptions = {},
  createSdkContextOption?: CreateSdkContextOptions,
) {
  return createSdkContext(
    {
      program,
      emitterOutputDir: resolveVirtualPath("tsp-output"),
      options: options,
    },
    options.emitterName ?? "@azure-tools/typespec-csharp",
    createSdkContextOption,
  );
}
