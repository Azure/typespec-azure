import { format } from "prettier";
import { afterEach, assert, describe, expect, it } from "vitest";
import { clearContexts, useContext } from "../../src/context-manager.js";
import { useBinder } from "../../src/framework/hooks/binder.js";
import { prettierTypeScriptOptions } from "../../src/lib.js";
import { buildClassicalClient } from "../../src/modular/build-classical-client.js";
import { buildClientContext } from "../../src/modular/build-client-context.js";
import { transformModularEmitterOptions } from "../../src/modular/build-modular-options.js";
import { buildRootIndex } from "../../src/modular/build-root-index.js";
import { buildSubpathIndexFile } from "../../src/modular/build-subpath-index.js";
import { transformClientOptions } from "../../src/transform/transform-client-options.js";
import { getClientHierarchyMap } from "../../src/utils/client-utils.js";
import {
  clearCompileCache,
  compileTypeSpecFor,
  createDpgContextTestHelper,
} from "../util/test-util.js";

async function emitClientSurface(code: string) {
  const { program } = await compileTypeSpecFor(code);
  expect(program.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  const context = await createDpgContextTestHelper(program);
  expect(context.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  context.generationPathDetail = {
    rootDir: "/package",
    metadataDir: "/package",
    sourcesDir: "/package/src",
  };
  context.emitterOptions = transformClientOptions({}, context);
  const modularOptions = transformModularEmitterOptions(context, "/package/src", {
    casing: "camel",
  });
  const binder = useBinder();
  const project = useContext("outputProject");
  const rootIndexFile = project.createSourceFile("/package/src/index.ts", "", { overwrite: true });
  const clientMaps = Array.from(getClientHierarchyMap(context));
  const contextFile = buildClientContext(context, clientMaps[0]!, modularOptions);
  const classicalFile = buildClassicalClient(context, clientMaps[0]!, modularOptions);
  buildSubpathIndexFile(modularOptions, "api", clientMaps[0]!, { recursive: true });
  buildRootIndex(context, modularOptions, rootIndexFile, clientMaps[0]!);
  binder.resolveAllReferences("/package/src");
  return {
    contextText: await format(contextFile.getFullText(), prettierTypeScriptOptions),
    classicalText: await format(classicalFile.getFullText(), prettierTypeScriptOptions),
    rootIndexText: await format(rootIndexFile.getFullText(), prettierTypeScriptOptions),
  };
}

describe("serviceConfigurations modular generation", () => {
  afterEach(() => {
    clearCompileCache();
    clearContexts();
  });

  it("emits paired cloud endpoints, OAuth2 scopes, KnownAudience enum, and root re-exports for fixed cloud configurations", async () => {
    const { contextText, classicalText, rootIndexText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "Configurations" })
      @azureServiceConfigurations(#{
        government: #{
          endpoint: "https://api.loganalytics.us/v1",
          authentication: typeref(
            OAuth2Auth<[
              {
                type: OAuth2FlowType.clientCredentials;
                tokenUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/token";
                scopes: ["https://api.loganalytics.us/.default"];
              }
            ]>
          ),
        },
        public: #{
          endpoint: "https://api.loganalytics.io/v1",
          authentication: typeref(
            OAuth2Auth<[
              {
                type: OAuth2FlowType.clientCredentials;
                tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token";
                scopes: ["https://api.loganalytics.io/.default"];
              }
            ]>
          ),
        },
      })
      namespace Configurations;

      @route("/query")
      @get
      op query(): void;
    `);

    assert.include(
      contextText,
      'export type ConfigurationsClientServiceConfiguration = "public" | "government";',
    );
    assert.include(contextText, "export enum KnownConfigurationsAudience");
    assert.include(contextText, 'Government = "https://api.loganalytics.us"');
    assert.include(contextText, 'Public = "https://api.loganalytics.io"');
    assert.include(contextText, "serviceConfiguration?: ConfigurationsClientServiceConfiguration;");
    assert.include(contextText, "audience?: string;");
    assert.include(
      contextText,
      "export function createConfigurations(\n  credential: TokenCredential,\n  options: ConfigurationsClientOptionalParams = {},\n): ConfigurationsContext",
    );
    assert.notInclude(contextText, "endpointParam");
    assert.include(
      contextText,
      'const selectedConfigurationName = options.serviceConfiguration ?? "public";',
    );
    assert.include(
      contextText,
      "const endpointUrl = options.endpoint ?? selectedConfiguration.endpoint;",
    );
    assert.include(contextText, '[`${options.audience.replace(/\\/+$/, "")}/.default`]');
    assert.include(contextText, ": selectedConfiguration.scopes)");
    assert.include(
      classicalText,
      'export { KnownConfigurationsAudience } from "./api/configurationsContext.js";',
    );
    assert.include(
      classicalText,
      'export type {\n  ConfigurationsClientOptionalParams,\n  ConfigurationsClientServiceConfiguration,\n} from "./api/configurationsContext.js";',
    );
    assert.include(
      rootIndexText,
      'export { ConfigurationsClient, KnownConfigurationsAudience } from "./configurationsClient.js";',
    );
    assert.include(
      rootIndexText,
      'export type { ConfigurationsClientServiceConfiguration } from "./configurationsClient.js";',
    );
  });

  it("keeps positional endpointParam for caller-supplied endpoints while pairing OAuth2 audiences and API key headers", async () => {
    const { contextText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "Search" })
      @azureServiceConfigurations(#{
        public: #{
          endpoint: "{endpoint}",
          parameters: typeref({ endpoint: url }),
          authentication: typeref(
            ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
              {
                type: OAuth2FlowType.implicit;
                authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
                scopes: ["https://search.azure.com/.default"];
              }
            ]>
          ),
        },
        government: #{
          endpoint: "{endpoint}",
          parameters: typeref({ endpoint: url }),
          authentication: typeref(
            ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
              {
                type: OAuth2FlowType.implicit;
                authorizationUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/authorize";
                scopes: ["https://search.azure.us/.default"];
              }
            ]>
          ),
        },
      })
      namespace Search;

      @route("/docs")
      @get
      op listDocs(): void;
    `);

    assert.include(contextText, "export enum KnownSearchAudience");
    assert.include(contextText, 'Public = "https://search.azure.com"');
    assert.include(contextText, 'Government = "https://search.azure.us"');
    assert.include(
      contextText,
      "export function createSearch(\n  endpointParam: string,\n  credential: KeyCredential | TokenCredential,\n  options: SearchClientOptionalParams = {},\n): SearchContext",
    );
    assert.include(contextText, "const endpointUrl = options.endpoint ?? `${endpointParam}`;");
    assert.include(
      contextText,
      "apiKeyHeaderName:\n        options.credentials?.apiKeyHeaderName ?? selectedConfiguration.apiKeyHeaderName",
    );
  });

  it("builds parameterized cloud host templates and resolves per-configuration default template arguments", async () => {
    const { contextText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "Regional" })
      @azureServiceConfigurations(#{
        public: #{
          endpoint: "https://{account}.{region}.example.com",
          parameters: typeref({ account: string, region?: string = "eastus" }),
          authentication: typeref(
            OAuth2Auth<[
              {
                type: OAuth2FlowType.clientCredentials;
                tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token";
                scopes: ["https://example.com/.default"];
              }
            ]>
          ),
        },
        government: #{
          endpoint: "https://{account}.{region}.example.us",
          parameters: typeref({ account: string, region?: string = "usgovvirginia" }),
          authentication: typeref(
            OAuth2Auth<[
              {
                type: OAuth2FlowType.clientCredentials;
                tokenUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/token";
                scopes: ["https://example.us/.default"];
              }
            ]>
          ),
        },
      })
      namespace Regional;

      @route("/items")
      @get
      op listItems(): void;
    `);

    assert.include(
      contextText,
      "export function createRegional(\n  account: string,\n  credential: TokenCredential,\n  options: RegionalClientOptionalParams = {},\n): RegionalContext",
    );
    assert.include(
      contextText,
      "const region = options.region ?? selectedConfiguration.defaults.region;",
    );
    assert.include(
      contextText,
      "const endpointUrl = options.endpoint ?? selectedConfiguration.buildEndpoint({ account, region });",
    );
    assert.include(
      contextText,
      "buildEndpoint: ({ account, region }) => `https://${account}.${region}.example.com`",
    );
    assert.include(
      contextText,
      "buildEndpoint: ({ account, region }) => `https://${account}.${region}.example.us`",
    );
  });

  it("suppresses KnownAudience and credentials when add-credentials is false while retaining serviceConfiguration endpoint selection", async () => {
    const { program } = await compileTypeSpecFor(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "NoCreds" })
      @azureServiceConfigurations(#{
        government: #{
          endpoint: "https://api.example.us",
          authentication: typeref(
            OAuth2Auth<[
              {
                type: OAuth2FlowType.clientCredentials;
                tokenUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/token";
                scopes: ["https://api.example.us/.default"];
              }
            ]>
          ),
        },
        public: #{
          endpoint: "https://api.example.com",
          authentication: typeref(
            OAuth2Auth<[
              {
                type: OAuth2FlowType.clientCredentials;
                tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token";
                scopes: ["https://api.example.com/.default"];
              }
            ]>
          ),
        },
      })
      namespace NoCreds;

      @route("/ping")
      @get
      op ping(): void;
    `);
    const context = await createDpgContextTestHelper(program, false, { "add-credentials": false });
    context.generationPathDetail = {
      rootDir: "/package",
      metadataDir: "/package",
      sourcesDir: "/package/src",
    };
    context.emitterOptions = transformClientOptions({ "add-credentials": false }, context);
    const modularOptions = transformModularEmitterOptions(context, "/package/src", {
      casing: "camel",
    });
    const binder = useBinder();
    const project = useContext("outputProject");
    const rootIndexFile = project.createSourceFile("/package/src/index.ts", "", {
      overwrite: true,
    });
    const clientMaps = Array.from(getClientHierarchyMap(context));
    const contextFile = buildClientContext(context, clientMaps[0]!, modularOptions);
    buildClassicalClient(context, clientMaps[0]!, modularOptions);
    buildSubpathIndexFile(modularOptions, "api", clientMaps[0]!, { recursive: true });
    buildRootIndex(context, modularOptions, rootIndexFile, clientMaps[0]!);
    binder.resolveAllReferences("/package/src");
    const contextText = await format(contextFile.getFullText(), prettierTypeScriptOptions);
    const rootIndexText = await format(rootIndexFile.getFullText(), prettierTypeScriptOptions);

    assert.include(
      contextText,
      'export type NoCredsClientServiceConfiguration = "public" | "government";',
    );
    assert.include(
      contextText,
      "const endpointUrl = options.endpoint ?? selectedConfiguration.endpoint;",
    );
    assert.notInclude(contextText, "KnownNoCredsAudience");
    assert.notInclude(contextText, "audience?: string;");
    assert.notInclude(rootIndexText, "KnownNoCredsAudience");
  });
});
