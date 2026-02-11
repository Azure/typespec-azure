import { Program, resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath, t } from "@typespec/compiler/testing";
import { TemplateWithMarkers } from "../../../core/packages/compiler/src/testing/marked-template.js";
import { createSdkContext, CreateSdkContextOptions } from "../src/context.js";
import { BrandedSdkEmitterOptionsInterface } from "../src/internal-utils.js";

export interface SdkTesterOptions extends BrandedSdkEmitterOptionsInterface {
  emitterName?: string;
}

/**
 * Simple base tester. Loads the core libraries needed for TCGC testing.
 */
export const SimpleBaseTester = createTester(resolvePath(import.meta.dirname, ".."), {
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
export const SimpleTester = SimpleBaseTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
).using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core");

/**
 * Tester with a built-in simple service namespace.
 */
export const SimpleTesterWithService = SimpleTester.wrap(
  (x) => `
@service(#{title: "Test Service"})
namespace TestService;

${x}
`,
);

/**
 * Tester with a built-in versioned service namespace.
 */
export const SimpleTesterWithVersionedService = SimpleTester.wrap(
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
 * XML tester with XML library support
 */
export const XmlTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-client-generator-core",
  )
  .using("Http", "Rest", "Versioning", "Xml", "Azure.ClientGenerator.Core");

export const XmlTesterWithBuiltInService = XmlTester.wrap(
  (x) => `
@service
namespace TestService;

${x}
`,
);

/**
 * Base tester for TCGC tests with Azure Core libraries loaded but no auto-imports/usings.
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
 * Tester for TCGC tests with Azure Core library support.
 */
export const AzureCoreTester = AzureCoreBaseTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-azure-core",
  "@azure-tools/typespec-client-generator-core",
).using(
  "Http",
  "Rest",
  "Versioning",
  "Azure.Core",
  "Azure.Core.Traits",
  "Azure.ClientGenerator.Core",
);

/**
 * Tester with a built-in Azure Core service namespace.
 */
export const AzureCoreTesterWithService = AzureCoreTester.wrap(
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
export const ArmTesterWithService = ArmTester.wrap(
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
 * Helper to create client customization test input.
 * Automatically adds common imports and usings to both files.
 */
export function createClientCustomizationInput(
  main: string | TemplateWithMarkers<any>,
  client: string | TemplateWithMarkers<any>,
  additionalImports: string[] = [],
  additionalUsings: string[] = [],
): {
  "main.tsp": TemplateWithMarkers<any>;
  "client.tsp": TemplateWithMarkers<any>;
} {
  const mainCode = TemplateWithMarkers.is(main) ? main.code : main;
  const clientCode = TemplateWithMarkers.is(client) ? client.code : client;

  return {
    "main.tsp": t.code`
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-client-generator-core";
${additionalImports.map((x) => `import "${x}";`).join("\n")}
import "./client.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;
${additionalUsings.map((x) => `using ${x};`).join("\n")}

${mainCode}
`,
    "client.tsp": t.code`
import "./main.tsp";
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-client-generator-core";
${additionalImports.map((x) => `import "${x}";`).join("\n")}
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;
${additionalUsings.map((x) => `using ${x};`).join("\n")}

${clientCode}
`,
  };
}

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
    options.emitterName ?? "@azure-tools/typespec-python",
    createSdkContextOption,
  );
}
