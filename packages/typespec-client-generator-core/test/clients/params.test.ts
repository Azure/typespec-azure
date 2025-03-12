import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { ApiKeyAuth, OAuth2Flow, Oauth2Auth } from "@typespec/http";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import {
  SdkClientType,
  SdkCredentialParameter,
  SdkCredentialType,
  SdkEndpointParameter,
  SdkEndpointType,
  SdkHttpOperation,
} from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

function getServiceWithDefaultApiVersion(op: string) {
  return `
    @server(
      "{endpoint}",
      "Testserver endpoint",
      {
        /**
         * Need to be set as 'http://localhost:3000' in client.
         */
        endpoint: url,
      }
    )
    @service
    @versioned(Versions)
    namespace Server.Versions.Versioned;

    /**
     * The version of the API.
     */
    enum Versions {
      /**
       * The version 2022-12-01-preview.
       */
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      v2022_12_01_preview: "2022-12-01-preview",
    }

    ${op}
    `;
}

it("name", async () => {
  await runner.compile(`
        @client({name: "MyClient"})
        @service
        namespace NotMyClient;
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  strictEqual(sdkPackage.clients[0].name, "MyClient");
  strictEqual(sdkPackage.clients[0].kind, "client");
  strictEqual(sdkPackage.clients[0].parent, undefined);
});
it("initialization default endpoint no credential", async () => {
  await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @service
        namespace My.Service;
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.name, "ServiceClientOptions");
  strictEqual(client.clientInitialization.parameters.length, 1);
  const endpointParam = client.clientInitialization.parameters[0];
  strictEqual(endpointParam.kind, "endpoint");
  strictEqual(endpointParam.name, "endpoint");
  strictEqual(endpointParam.onClient, true);
  strictEqual(endpointParam.optional, false);
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");
  strictEqual(endpointParam.urlEncode, false);
  strictEqual(endpointParam.type.templateArguments.length, 1);
  const templateArg = endpointParam.type.templateArguments[0];
  strictEqual(templateArg.kind, "path");
  strictEqual(templateArg.name, "endpoint");
  strictEqual(templateArg.serializedName, "endpoint");
  strictEqual(templateArg.urlEncode, false);
  strictEqual(templateArg.type.kind, "string");
  strictEqual(templateArg.optional, false);
  strictEqual(templateArg.onClient, true);
  strictEqual(templateArg.clientDefaultValue, "http://localhost:3000");
});

it("initialization default endpoint with apikey auth", async () => {
  await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service
        namespace My.Service;
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.parameters.length, 2);

  const endpointParam = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  )[0];
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");
  strictEqual(endpointParam.type.templateArguments.length, 1);
  const templateArg = endpointParam.type.templateArguments[0];
  strictEqual(templateArg.kind, "path");
  strictEqual(templateArg.type.kind, "string");
  strictEqual(templateArg.clientDefaultValue, "http://localhost:3000");

  const credentialParam = client.clientInitialization.parameters.filter(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  )[0];
  strictEqual(credentialParam.name, "credential");
  strictEqual(credentialParam.onClient, true);
  strictEqual(credentialParam.optional, false);
  strictEqual(credentialParam.type.kind, "credential");
  const scheme = credentialParam.type.scheme;
  strictEqual(scheme.type, "apiKey");
  strictEqual(scheme.in, "header");
  strictEqual(scheme.name, "x-ms-api-key");
});

it("initialization default endpoint with bearer auth", async () => {
  await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(OAuth2Auth<[MyFlow]>)
        @service
        namespace My.Service;

        model MyFlow {
          type: OAuth2FlowType.implicit;
          authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize";
          scopes: ["https://security.microsoft.com/.default"];
        }
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.parameters.length, 2);

  const endpointParam = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  )[0];
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");
  strictEqual(endpointParam.type.templateArguments.length, 1);
  const templateArg = endpointParam.type.templateArguments[0];
  strictEqual(templateArg.kind, "path");
  strictEqual(templateArg.type.kind, "string");
  strictEqual(templateArg.optional, false);
  strictEqual(templateArg.onClient, true);
  strictEqual(templateArg.clientDefaultValue, "http://localhost:3000");

  const credentialParam = client.clientInitialization.parameters.filter(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  )[0];
  strictEqual(credentialParam.name, "credential");
  strictEqual(credentialParam.onClient, true);
  strictEqual(credentialParam.optional, false);
  strictEqual(credentialParam.type.kind, "credential");
  const scheme = credentialParam.type.scheme;
  strictEqual(scheme.type, "oauth2");
  strictEqual(scheme.flows.length, 1);
  strictEqual(scheme.flows[0].type, "implicit");
  strictEqual(
    scheme.flows[0].authorizationUrl,
    "https://login.microsoftonline.com/common/oauth2/authorize",
  );
  strictEqual(scheme.flows[0].scopes.length, 1);
  strictEqual(scheme.flows[0].scopes[0].value, "https://security.microsoft.com/.default");
});

it("initialization default endpoint with union auth", async () => {
  await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key"> | OAuth2Auth<[MyFlow]>)
        @service
        namespace My.Service;

        model MyFlow {
          type: OAuth2FlowType.implicit;
          authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize";
          scopes: ["https://security.microsoft.com/.default"];
        }
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.parameters.length, 2);

  const endpointParam = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  )[0];
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");
  strictEqual(endpointParam.type.templateArguments.length, 1);
  const templateArg = endpointParam.type.templateArguments[0];
  strictEqual(templateArg.kind, "path");
  strictEqual(templateArg.name, "endpoint");
  strictEqual(templateArg.clientDefaultValue, "http://localhost:3000");

  const credentialParam = client.clientInitialization.parameters.filter(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  )[0];
  strictEqual(credentialParam.name, "credential");
  strictEqual(credentialParam.onClient, true);
  strictEqual(credentialParam.optional, false);
  strictEqual(credentialParam.type.kind, "union");
  strictEqual(credentialParam.type.name, "ServiceCredentialUnion");
  strictEqual(credentialParam.type.isGeneratedName, true);
  strictEqual(credentialParam.type.variantTypes.length, 2);
  const schemes = credentialParam.type.variantTypes
    .filter((v): v is SdkCredentialType => v.kind === "credential")
    .map((s) => s.scheme);
  strictEqual(schemes.length, 2);
  const apiKeyScheme = schemes.filter(
    (s): s is ApiKeyAuth<"header", "x-ms-api-key"> => s.type === "apiKey",
  )[0];
  strictEqual(apiKeyScheme.type, "apiKey");
  strictEqual(apiKeyScheme.in, "header");
  strictEqual(apiKeyScheme.name, "x-ms-api-key");

  const oauth2Scheme = schemes.filter((s): s is Oauth2Auth<OAuth2Flow[]> => s.type === "oauth2")[0];
  strictEqual(oauth2Scheme.flows.length, 1);
  strictEqual(oauth2Scheme.flows[0].type, "implicit");
  strictEqual(
    oauth2Scheme.flows[0].authorizationUrl,
    "https://login.microsoftonline.com/common/oauth2/authorize",
  );
  strictEqual(oauth2Scheme.flows[0].scopes.length, 1);
  strictEqual(oauth2Scheme.flows[0].scopes[0].value, "https://security.microsoft.com/.default");
});

it("initialization one server parameter with apikey auth", async () => {
  await runner.compile(`
        @server(
          "{endpointInput}",
          "Testserver endpoint",
          {
            endpointInput: url,
          }
        )
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service
        namespace My.Service;
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.parameters.length, 2);

  const endpointParam = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  )[0];
  strictEqual(endpointParam.clientDefaultValue, undefined);
  strictEqual(endpointParam.urlEncode, false);
  strictEqual(endpointParam.name, "endpoint");
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.onClient, true);
  strictEqual(endpointParam.optional, false);
  strictEqual(endpointParam.kind, "endpoint");
  strictEqual(endpointParam.type.templateArguments.length, 1);
  const templateArg = endpointParam.type.templateArguments[0];
  strictEqual(templateArg.kind, "path");
  strictEqual(templateArg.name, "endpointInput");
  strictEqual(templateArg.urlEncode, false);
  strictEqual(templateArg.optional, false);
  strictEqual(templateArg.onClient, true);
  strictEqual(templateArg.clientDefaultValue, undefined);
  strictEqual(templateArg.doc, undefined);

  const credentialParam = client.clientInitialization.parameters.filter(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  )[0];
  strictEqual(credentialParam.name, "credential");
  strictEqual(credentialParam.onClient, true);
  strictEqual(credentialParam.optional, false);
  strictEqual(credentialParam.type.kind, "credential");
  const scheme = credentialParam.type.scheme;
  strictEqual(scheme.type, "apiKey");
  strictEqual(scheme.in, "header");
  strictEqual(scheme.name, "x-ms-api-key");
});

it("initialization multiple server parameters with apikey auth", async () => {
  await runner.compile(`
        @versioned(Versions)
        @server(
          "{endpoint}/server/path/multiple/{apiVersion}",
          "Test server with path parameters.",
          {
            @doc("Pass in http://localhost:3000 for endpoint.")
            endpoint: url,

            @doc("Pass in v1.0 for API version.")
            apiVersion: Versions,
          }
        )
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service
        namespace My.Service;

        enum Versions {
          @doc("Version 1.0")
          v1_0: "v1.0",
        }
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.parameters.length, 2);
  strictEqual(client.apiVersions.length, 1);
  strictEqual(client.apiVersions[0], "v1.0");

  const endpointParams = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  strictEqual(endpointParams.length, 1);
  const endpointParam = endpointParams[0];
  strictEqual(endpointParam.clientDefaultValue, undefined);
  strictEqual(endpointParam.urlEncode, false);
  strictEqual(endpointParam.name, "endpoint");
  strictEqual(endpointParam.onClient, true);
  strictEqual(endpointParam.optional, false);
  strictEqual(endpointParam.kind, "endpoint");

  const endpointParamType = endpointParam.type;
  strictEqual(endpointParamType.kind, "union");
  strictEqual(endpointParamType.variantTypes.length, 2);

  const overridableEndpoint = endpointParamType.variantTypes.find(
    (x) => x.kind === "endpoint" && x.serverUrl === "{endpoint}",
  ) as SdkEndpointType;
  ok(overridableEndpoint);
  strictEqual(overridableEndpoint.templateArguments.length, 1);
  strictEqual(overridableEndpoint.templateArguments[0].name, "endpoint");
  strictEqual(overridableEndpoint.templateArguments[0].clientDefaultValue, undefined);

  const templatedEndpoint = endpointParamType.variantTypes.find(
    (x) => x.kind === "endpoint" && x.serverUrl === "{endpoint}/server/path/multiple/{apiVersion}",
  ) as SdkEndpointType;
  ok(templatedEndpoint);
  strictEqual(templatedEndpoint.templateArguments.length, 2);
  const endpointTemplateArg = templatedEndpoint.templateArguments[0];
  strictEqual(endpointTemplateArg.name, "endpoint");
  strictEqual(endpointTemplateArg.onClient, true);
  strictEqual(endpointTemplateArg.optional, false);
  strictEqual(endpointTemplateArg.kind, "path");

  const apiVersionParam = templatedEndpoint.templateArguments[1];
  strictEqual(apiVersionParam.clientDefaultValue, "v1.0");
  strictEqual(apiVersionParam.urlEncode, true);
  strictEqual(apiVersionParam.name, "apiVersion");
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.kind, "path");
  deepStrictEqual(client.apiVersions, ["v1.0"]);

  const credentialParam = client.clientInitialization.parameters.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );
  ok(credentialParam);
  strictEqual(credentialParam.name, "credential");
  strictEqual(credentialParam.onClient, true);
  strictEqual(credentialParam.optional, false);
  strictEqual(credentialParam.type.kind, "credential");
  const scheme = credentialParam.type.scheme;
  strictEqual(scheme.type, "apiKey");
  strictEqual(scheme.in, "header");
  strictEqual(scheme.name, "x-ms-api-key");
});

it("non-versioning service with api version param in endpoint", async () => {
  await runner.compile(`
        @server(
          "{endpoint}/server/path/multiple/{apiVersion}",
          "Test server with path parameters.",
          {
            @doc("Pass in http://localhost:3000 for endpoint.")
            endpoint: url = "http://localhost:3000",

            @doc("Pass in v1.0 for API version.")
            apiVersion: string = "v1",
          }
        )
        @service
        namespace My.Service;
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.parameters.length, 1);

  const endpointParams = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  strictEqual(endpointParams.length, 1);
  const endpointParam = endpointParams[0];
  strictEqual(endpointParam.clientDefaultValue, undefined);
  strictEqual(endpointParam.urlEncode, false);
  strictEqual(endpointParam.name, "endpoint");
  strictEqual(endpointParam.onClient, true);
  strictEqual(endpointParam.optional, false);
  strictEqual(endpointParam.kind, "endpoint");

  const endpointParamType = endpointParam.type;
  strictEqual(endpointParamType.kind, "union");
  strictEqual(endpointParamType.variantTypes.length, 2);

  const overridableEndpoint = endpointParamType.variantTypes.find(
    (x) => x.kind === "endpoint" && x.serverUrl === "{endpoint}",
  ) as SdkEndpointType;
  ok(overridableEndpoint);
  strictEqual(overridableEndpoint.templateArguments.length, 1);
  strictEqual(overridableEndpoint.templateArguments[0].name, "endpoint");
  strictEqual(overridableEndpoint.templateArguments[0].clientDefaultValue, undefined);

  const templatedEndpoint = endpointParamType.variantTypes.find(
    (x) => x.kind === "endpoint" && x.serverUrl === "{endpoint}/server/path/multiple/{apiVersion}",
  ) as SdkEndpointType;
  ok(templatedEndpoint);
  strictEqual(templatedEndpoint.templateArguments.length, 2);
  const endpointTemplateArg = templatedEndpoint.templateArguments[0];
  strictEqual(endpointTemplateArg.name, "endpoint");
  strictEqual(endpointTemplateArg.onClient, true);
  strictEqual(endpointTemplateArg.optional, false);
  strictEqual(endpointTemplateArg.kind, "path");
  strictEqual(endpointTemplateArg.clientDefaultValue, "http://localhost:3000");

  const apiVersionParam = templatedEndpoint.templateArguments[1];
  strictEqual(apiVersionParam.clientDefaultValue, "v1");
  strictEqual(apiVersionParam.name, "apiVersion");
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.kind, "path");
});

it("endpoint with path param default value", async () => {
  await runner.compile(`
        @server(
          "{endpoint}",
          "Test server endpoint",
          {
            endpoint: string = "http://localhost:3000",
          }
        )
        @service
        namespace MyService;
      `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.parameters.length, 1);

  const endpointParam = client.clientInitialization.parameters.filter(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  )[0];
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");

  strictEqual(endpointParam.type.templateArguments.length, 1);
  const endpointTemplateArg = endpointParam.type.templateArguments[0];
  strictEqual(endpointTemplateArg.name, "endpoint");
  strictEqual(endpointTemplateArg.onClient, true);
  strictEqual(endpointTemplateArg.optional, false);
  strictEqual(endpointTemplateArg.kind, "path");
  strictEqual(endpointTemplateArg.clientDefaultValue, "http://localhost:3000");
});

function getServiceNoDefaultApiVersion(op: string) {
  return `
    @server(
      "{endpoint}",
      "Testserver endpoint",
      {
        /**
         * Need to be set as 'http://localhost:3000' in client.
         */
        endpoint: url,
      }
    )
    @service
    namespace Server.Versions.NotVersioned;

    ${op}
    `;
}

it("service with no default api version, method with no api version param", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(
    getServiceNoDefaultApiVersion(`
        @route("/without-api-version")
        @head
        op withoutApiVersion(): OkResponse;
        `),
  );
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");

  strictEqual(client.methods.length, 1);

  const withoutApiVersion = client.methods[0];
  strictEqual(withoutApiVersion.name, "withoutApiVersion");
  strictEqual(withoutApiVersion.kind, "basic");
  strictEqual(withoutApiVersion.parameters.length, 0);
  strictEqual(withoutApiVersion.operation.parameters.length, 0);
});

it("service with no default api version, method with api version param", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(
    getServiceNoDefaultApiVersion(`
      @route("/with-query-api-version")
      @head
      op withQueryApiVersion(@query("api-version") apiVersion: string): OkResponse;
        `),
  );
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];

  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");

  strictEqual(sdkPackage.clients[0].methods.length, 1);
  const withApiVersion = sdkPackage.clients[0].methods[0];
  strictEqual(withApiVersion.kind, "basic");
  strictEqual(withApiVersion.parameters.length, 1);
  const apiVersionMethodParam = withApiVersion.parameters[0];
  strictEqual(apiVersionMethodParam.name, "apiVersion");
  strictEqual(apiVersionMethodParam.kind, "method");
  strictEqual(apiVersionMethodParam.isApiVersionParam, true);
  strictEqual(apiVersionMethodParam.optional, false);
  strictEqual(apiVersionMethodParam.onClient, false);
  strictEqual(apiVersionMethodParam.type.kind, "string");
  strictEqual(apiVersionMethodParam.clientDefaultValue, undefined);

  strictEqual(withApiVersion.operation.parameters.length, 1);
  const apiVersionParam = withApiVersion.operation.parameters[0];
  strictEqual(apiVersionParam.kind, "query");
  strictEqual(apiVersionParam.isApiVersionParam, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.onClient, false);
  strictEqual(apiVersionParam.type.kind, "string");
  strictEqual(apiVersionParam.clientDefaultValue, undefined);
  strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(apiVersionParam.correspondingMethodParams[0], apiVersionMethodParam);
});

it("service with default api version, method without api version param", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(
    getServiceWithDefaultApiVersion(`
      @route("/without-api-version")
      @head
      op withoutApiVersion(): OkResponse;
      `),
  );
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");

  const withoutApiVersion = client.methods[0];
  strictEqual(withoutApiVersion.kind, "basic");
  strictEqual(withoutApiVersion.parameters.length, 0);
  strictEqual(withoutApiVersion.operation.parameters.length, 0);
  strictEqual(
    withoutApiVersion.crossLanguageDefinitionId,
    "Server.Versions.Versioned.withoutApiVersion",
  );
});

it("service with default api version, method with api version param", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(
    getServiceWithDefaultApiVersion(`
        @route("/with-query-api-version")
        @head
        op withQueryApiVersion(@query("api-version") apiVersion: string): OkResponse;
      `),
  );
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.parameters.length, 2);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");

  const clientApiVersionParam = client.clientInitialization.parameters[1];
  strictEqual(clientApiVersionParam.name, "apiVersion");
  strictEqual(clientApiVersionParam.onClient, true);
  strictEqual(clientApiVersionParam.optional, false);
  strictEqual(clientApiVersionParam.kind, "apiVersion");
  strictEqual(clientApiVersionParam.clientDefaultValue, "2022-12-01-preview");
  strictEqual(clientApiVersionParam.isApiVersionParam, true);
  strictEqual(clientApiVersionParam.type.kind, "string");
  strictEqual(client.methods.length, 1);

  const withApiVersion = client.methods[0];
  strictEqual(withApiVersion.name, "withQueryApiVersion");
  strictEqual(withApiVersion.kind, "basic");
  strictEqual(
    withApiVersion.crossLanguageDefinitionId,
    "Server.Versions.Versioned.withQueryApiVersion",
  );
  strictEqual(withApiVersion.parameters.length, 0);
  strictEqual(withApiVersion.operation.parameters.length, 1);

  const apiVersionParam = withApiVersion.operation.parameters[0];
  strictEqual(apiVersionParam.kind, "query");
  strictEqual(apiVersionParam.isApiVersionParam, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.type.kind, "string");
  strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01-preview");
  strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(
    apiVersionParam.correspondingMethodParams[0],
    client.clientInitialization.parameters.find((x) => x.isApiVersionParam),
  );
});

it("service with default api version, method with path api version param", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(
    getServiceWithDefaultApiVersion(`
        @route("/with-path-api-version")
        @head
        op withPathApiVersion(@path apiVersion: string): OkResponse;
      `),
  );
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.parameters.length, 2);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");

  const clientApiVersionParam = client.clientInitialization.parameters[1];
  strictEqual(clientApiVersionParam.name, "apiVersion");
  strictEqual(clientApiVersionParam.onClient, true);
  strictEqual(clientApiVersionParam.optional, false);
  strictEqual(clientApiVersionParam.kind, "apiVersion");
  strictEqual(clientApiVersionParam.clientDefaultValue, "2022-12-01-preview");
  strictEqual(clientApiVersionParam.isApiVersionParam, true);
  strictEqual(clientApiVersionParam.type.kind, "string");
  strictEqual(client.methods.length, 1);

  const withApiVersion = client.methods[0];
  strictEqual(withApiVersion.name, "withPathApiVersion");
  strictEqual(withApiVersion.kind, "basic");
  strictEqual(
    withApiVersion.crossLanguageDefinitionId,
    "Server.Versions.Versioned.withPathApiVersion",
  );
  strictEqual(withApiVersion.parameters.length, 0);
  strictEqual(withApiVersion.operation.parameters.length, 1);

  const apiVersionParam = withApiVersion.operation.parameters[0];
  strictEqual(apiVersionParam.kind, "path");
  strictEqual(apiVersionParam.serializedName, "apiVersion");
  strictEqual(apiVersionParam.name, "apiVersion");
  strictEqual(apiVersionParam.isApiVersionParam, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.type.kind, "string");
  strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01-preview");
  strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(
    apiVersionParam.correspondingMethodParams[0],
    client.clientInitialization.parameters.find((x) => x.isApiVersionParam),
  );
});

it("endpoint template argument with default value of enum member", async () => {
  await runner.compile(`
      @server(
        "{endpoint}/client/structure/{client}",
        "",
        {
          @doc("Need to be set as 'http://localhost:3000' in client.")
          endpoint: url,
      
          @doc("Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.")
          client: ClientType = ClientType.Default,
        }
      )
      @service
      namespace My.Service;

      enum ClientType {
        Default: "default",
        MultiClient: "multi-client",
        RenamedOperation: "renamed-operation",
        TwoOperationGroup: "two-operation-group",
        ClientOperationGroup: "client-operation-group",
      }
    `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];

  strictEqual(client.clientInitialization.parameters.length, 1);
  const parameter = client.clientInitialization.parameters[0];
  strictEqual(parameter.name, "endpoint");
  strictEqual(parameter.type.kind, "union");

  const templateArg = parameter.type.variantTypes[0];
  strictEqual(templateArg.kind, "endpoint");
  strictEqual(templateArg.templateArguments.length, 2);
  const clientTemplateArg = templateArg.templateArguments[1];
  strictEqual(clientTemplateArg.kind, "path");
  strictEqual(clientTemplateArg.name, "client");
  strictEqual(clientTemplateArg.optional, false);
  strictEqual(clientTemplateArg.onClient, true);
  strictEqual(clientTemplateArg.clientDefaultValue, "default");
});

it("client level signatures by default", async () => {
  const runnerWithArm = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithArm.compileWithBuiltInAzureResourceManagerService(`
      model MyProperties {
        @visibility(Lifecycle.Read)
        @doc("Display name of the Azure Extended Zone.")
        displayName: string;
      }

      @subscriptionResource
      model MyModel is ProxyResource<MyProperties> {
        @key("extendedZoneName")
        @segment("extendedZones")
        @path
        name: string;
      }

      namespace MyClient {
        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface MyInterface {
          get is ArmResourceRead<MyModel>;
        }
      }
    `);

  const sdkPackage = runnerWithArm.context.sdkPackage;
  const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
    ?.response as SdkClientType<SdkHttpOperation>;
  for (const p of client.initialization.properties) {
    ok(p.onClient);
  }
  deepStrictEqual(client.initialization.properties.map((x) => x.name).sort(), [
    "apiVersion",
    "credential",
    "endpoint",
    "subscriptionId",
  ]);
});
