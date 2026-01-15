import { Program, resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { createSdkContext, CreateSdkContextOptions } from "../src/context.js";
import { BrandedSdkEmitterOptionsInterface } from "../src/internal-utils.js";

export interface SdkTesterOptions extends BrandedSdkEmitterOptionsInterface {
  emitterName?: string;
}

/**
 * Base tester for TCGC tests. Loads the core libraries needed for TCGC testing.
 */
export const TcgcTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-client-generator-core",
  ],
});

/**
 * Simple tester with common imports and usings for TCGC testing.
 */
export const SimpleTester = TcgcTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
).using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core");

/**
 * Tester with a built-in simple service namespace.
 */
export const SimpleTesterWithBuiltInService = SimpleTester.wrap(
  (x) => `
@service
namespace TestService;

${x}
`,
);

/**
 * Tester with a built-in versioned service namespace.
 */
export const VersionedServiceTester = SimpleTester.wrap(
  (x) => `
@service
@versioned(Versions)
@server(
  "{endpoint}/versioning/api-version:{version}",
  "Testserver endpoint",
  {
    endpoint: url,
    version: Versions,
  }
)
namespace Versioning;
enum Versions {
  v1: "v1",
  v2: "v2",
}

${x}
`,
);

/**
 * Tester for TCGC tests with Azure Core library support.
 */
export const AzureCoreTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
  )
  .using("Http", "Rest", "Versioning", "Azure.Core", "Azure.ClientGenerator.Core");

/**
 * Tester with a built-in Azure Core service namespace.
 */
export const AzureCoreServiceTester = AzureCoreTester.wrap(
  (x) => `
@server("http://localhost:3000", "endpoint")
@service
@versioned(Versions)
namespace My.Service;
enum Versions {v1}

${x}
`,
);

/**
 * Tester for TCGC tests with Azure Resource Manager library support.
 */
export const ArmTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  )
  .using(
    "Http",
    "Rest",
    "Versioning",
    "Azure.Core",
    "Azure.ResourceManager",
    "Azure.ClientGenerator.Core",
  );

/**
 * Tester with a built-in Azure Resource Manager service namespace.
 */
export const ArmServiceTester = ArmTester.wrap(
  (x) => `
@armProviderNamespace("My.Service")
@server("http://localhost:3000", "endpoint")
@service(#{title: "My.Service"})
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace My.Service;

/** Api versions */
enum Versions {
  /** 2024-04-01-preview api version */
      V2024_04_01_PREVIEW: "2024-04-01-preview",
}

${x}
`,
);

/**
 * Helper function to create an SDK context for tester-based tests.
 * Use this after calling compile() on a tester instance.
 *
 * @param program - The program from the tester compile result
 * @param options - SDK tester options including emitterName
 * @param createSdkContextOption - Additional options for SDK context creation
 * @returns An SDK context for use with TCGC APIs
 */
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
