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
@versioned(ServiceVersions)
@server(
  "{endpoint}/versioning/api-version:{version}",
  "Testserver endpoint",
  {
    endpoint: url,
    version: ServiceVersions,
  }
)
namespace VersioningService;
enum ServiceVersions {
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
  .using(
    "Http",
    "Rest",
    "Versioning",
    "Azure.Core",
    "Azure.Core.Traits",
    "Azure.ClientGenerator.Core",
  );

/**
 * Base tester for TCGC tests with Azure Core libraries loaded but no auto-imports/usings.
 * Use this for multi-file tests where files have explicit imports.
 */
export const AzureCoreBaseTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
  ],
});

/**
 * Helper to create multi-file test input for main.tsp + client.tsp scenarios.
 * Automatically adds common imports and usings to both files.
 *
 * @example
 * ```ts
 * const { program } = await TcgcTester.compile(
 *   createTcgcMultiFileInput({
 *     "main.tsp": `
 *       @service
 *       namespace MyService;
 *       op test(): void;
 *     `,
 *     "client.tsp": `
 *       @client({ name: "MyClient", service: MyService })
 *       namespace MyClient {}
 *     `,
 *   })
 * );
 * ```
 */
export function createTcgcMultiFileInput(files: { "main.tsp": string; "client.tsp": string }): {
  "main.tsp": string;
  "client.tsp": string;
} {
  return {
    "main.tsp": `
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-client-generator-core";
import "./client.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;

${files["main.tsp"]}
`,
    "client.tsp": `
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
using Azure.ClientGenerator.Core;

${files["client.tsp"]}
`,
  };
}

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
