import { getClient } from "@azure-rest/core-client";
import { AzureKeyCredential, isKeyCredential } from "@azure/core-auth";
import { createHttpHeaders, type PipelineRequest } from "@azure/core-rest-pipeline";
import { format } from "prettier";
import { ts } from "ts-morph";
import { afterEach, assert, describe, expect, it } from "vitest";
import { clearContexts, useContext } from "../../src/context-manager.js";
import { useBinder } from "../../src/framework/hooks/binder.js";
import { prettierTypeScriptOptions } from "../../src/lib.js";
import { buildClassicalClient } from "../../src/modular/build-classical-client.js";
import { buildClientContext } from "../../src/modular/build-client-context.js";
import { transformModularEmitterOptions } from "../../src/modular/build-modular-options.js";
import { buildRootIndex } from "../../src/modular/build-root-index.js";
import { buildSubpathIndexFile } from "../../src/modular/build-subpath-index.js";
import {
  buildConfigurationEndpointExpression,
  type ResolvedServiceConfigurationEntry,
  type ServiceConfigurationTemplateParam,
} from "../../src/modular/helpers/service-configuration-helpers.js";
import { transformClientOptions } from "../../src/transform/transform-client-options.js";
import { getClientHierarchyMap } from "../../src/utils/client-utils.js";
import {
  clearCompileCache,
  compileTypeSpecFor,
  createDpgContextTestHelper,
} from "../util/test-util.js";

function evaluateContextModule(contextText: string): Record<string, any> {
  const { outputText } = ts.transpileModule(contextText, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exportsObj: Record<string, any> = {};
  const moduleObj = { exports: exportsObj };
  const runtimeRequire = (specifier: string) => {
    if (specifier === "@azure-rest/core-client") {
      return { getClient };
    }
    if (specifier === "@azure/core-auth") {
      return { isKeyCredential };
    }
    if (specifier === "@azure/core-rest-pipeline") {
      return {
        bearerTokenAuthenticationPolicyName: "bearerTokenAuthenticationPolicy",
      };
    }
    if (specifier === "../logger.js") {
      return { logger: { info: () => undefined } };
    }
    if (specifier.endsWith("/package.json")) {
      return { version: "1.0.0" };
    }
    throw new Error(`Unexpected runtime import in test: ${specifier}`);
  };
  const fn = new Function("exports", "module", "require", outputText);
  fn(exportsObj, moduleObj, runtimeRequire);
  return moduleObj.exports;
}

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

  it("supports KeyCredential with custom HttpAuth without triggering getClient Missing API Key Header Name", async () => {
    const { contextText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "SharedKeyService" })
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
            ]> | {
              type: AuthType.http;
              scheme: "SharedKey";
            }
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
            ]> | {
              type: AuthType.http;
              scheme: "SharedKey";
            }
          ),
        },
      })
      namespace SharedKeyService;

      @route("/ping")
      @get
      op ping(): void;
    `);

    assert.include(
      contextText,
      "isKeyCredential(credential) && !options.credentials?.apiKeyHeaderName",
    );
    assert.include(contextText, "customKeyCredentialPolicy");

    const mod = evaluateContextModule(contextText);
    const capturedRequests: PipelineRequest[] = [];
    const client = mod.createSharedKeyService(new AzureKeyCredential("my-shared-secret"), {
      serviceConfiguration: "government",
      httpClient: {
        sendRequest: async (request: PipelineRequest) => {
          capturedRequests.push(request);
          return {
            request,
            status: 204,
            headers: createHttpHeaders(),
          };
        },
      },
    });
    await client.pathUnchecked("/ping").get();
    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0]!.url).toBe("https://api.example.us/ping");
    expect(capturedRequests[0]!.headers.get("authorization")).toBe("SharedKey my-shared-secret");
  });

  it("merges per-configuration literal parameter types across configurations", async () => {
    const { contextText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "RegionService" })
      @azureServiceConfigurations(#{
        government: #{
          endpoint: "https://{region}.api.example.us",
          parameters: typeref({
            region?: "usgovvirginia" = "usgovvirginia";
          }),
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
          endpoint: "https://{region}.api.example.com",
          parameters: typeref({
            region?: "eastus" = "eastus";
          }),
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
      namespace RegionService;

      @route("/ping")
      @get
      op ping(): void;
    `);

    assert.include(
      contextText,
      'export interface RegionServiceContext extends Client {\n  region?: "eastus" | "usgovvirginia";\n}',
    );
    assert.include(contextText, 'defaults: { region?: "eastus" | "usgovvirginia" };');
    assert.include(
      contextText,
      'buildEndpoint: (params: { region: "eastus" | "usgovvirginia" | undefined }) => string;',
    );
    assert.include(contextText, 'region?: "eastus" | "usgovvirginia";');
  });

  it("validates required configuration parameters before expanding non-default endpoints while allowing explicit endpoint override", async () => {
    const { contextText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "HybridCloud" })
      @azureServiceConfigurations(#{
        government: #{
          endpoint: "https://{region}.api.example.us",
          parameters: typeref({
            region: string;
          }),
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
      namespace HybridCloud;

      @route("/ping")
      @get
      op ping(): void;
    `);

    assert.include(contextText, "region?: string;");
    assert.include(
      contextText,
      'Required parameter "region" must be provided in options for serviceConfiguration "government".',
    );

    const mod = evaluateContextModule(contextText);
    const tokenCred = {
      getToken: async () => ({ token: "test-token", expiresOnTimestamp: Date.now() + 60_000 }),
    };
    const defaultClient = mod.createHybridCloud(tokenCred);
    expect(defaultClient).toBeDefined();

    expect(() => mod.createHybridCloud(tokenCred, { serviceConfiguration: "government" })).toThrow(
      'Required parameter "region" must be provided in options for serviceConfiguration "government".',
    );

    const govClientWithRegion = mod.createHybridCloud(tokenCred, {
      serviceConfiguration: "government",
      region: "usgovvirginia",
    });
    expect(govClientWithRegion).toBeDefined();

    const govClientWithExplicitEndpoint = mod.createHybridCloud(tokenCred, {
      serviceConfiguration: "government",
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });
    expect(govClientWithExplicitEndpoint).toBeDefined();
  });

  it("substitutes original TypeSpec placeholder names when parameter names are camelCased or renamed", async () => {
    const { contextText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      import "@azure-tools/typespec-client-generator-core";
      using TypeSpec.Http;
      using Azure.Core;
      using Azure.ClientGenerator.Core;

      @service(#{ title: "PlaceholderRename" })
      @azureServiceConfigurations(#{
        government: #{
          endpoint: "https://{account_name}.api.example.us",
          parameters: typeref({
            @clientName("account")
            account_name: string;
          }),
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
          endpoint: "https://{account_name}.api.example.com",
          parameters: typeref({
            @clientName("account")
            account_name: string;
          }),
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
      namespace PlaceholderRename;

      @route("/ping")
      @get
      op ping(): void;
    `);

    assert.include(
      contextText,
      "buildEndpoint: ({ account }) => `https://${account}.api.example.com`",
    );
    assert.include(
      contextText,
      "buildEndpoint: ({ account }) => `https://${account}.api.example.us`",
    );
    assert.notInclude(contextText, "{account_name}");
  });

  it("preserves single-configuration output when @azureServiceConfigurations has only one entry", async () => {
    const { contextText, rootIndexText } = await emitClientSurface(`
      import "@typespec/http";
      import "@azure-tools/typespec-azure-core";
      using TypeSpec.Http;
      using Azure.Core;

      @service(#{ title: "SingleConfig" })
      @azureServiceConfigurations(#{
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
      namespace SingleConfig;

      @route("/ping")
      @get
      op ping(): void;
    `);

    assert.notInclude(contextText, "SingleConfigClientServiceConfiguration");
    assert.notInclude(contextText, "serviceConfiguration?:");
    assert.notInclude(contextText, "KnownSingleConfigAudience");
    assert.notInclude(rootIndexText, "KnownSingleConfigAudience");
  });

  it("escapes backslashes, backticks, and dollar-brace sequences in static endpoint template chunks", () => {
    const entry: ResolvedServiceConfigurationEntry = {
      name: "public",
      serverUrl: "https://{account}.example.com/\\raw/`tick`/${notExpr}",
      templateArguments: [
        {
          name: "account",
          serializedName: "account",
          optional: false,
          __raw: { name: "account" },
        } as any,
      ],
      oauthScopes: [],
    };
    const templateParams = new Map<string, ServiceConfigurationTemplateParam>([
      [
        "account",
        {
          paramName: "account",
          typeExpression: "string",
          optional: false,
          hasPerConfigDefaults: false,
          perConfigDefaults: new Map([["public", undefined]]),
          requiredInConfigurations: new Set(["public"]),
        },
      ],
    ]);
    const expr = buildConfigurationEndpointExpression(entry, templateParams, (p) => p.name);
    expect(expr).toBe(
      "({ account }) => `https://${account}.example.com/\\\\raw/\\`tick\\`/\\${notExpr}`",
    );
  });
});
