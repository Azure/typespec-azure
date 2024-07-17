/* eslint-disable deprecation/deprecation */
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ApiKeyAuth, OAuth2Flow, Oauth2Auth } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkClientType,
  SdkCredentialParameter,
  SdkCredentialType,
  SdkEndpointParameter,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkPackage,
  SdkQueryParameter,
  SdkServiceMethod,
  UsageFlags,
} from "../src/interfaces.js";
import { getAllModels } from "../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: package", () => {
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
    @service({})
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

  describe("package name", () => {
    it("as config option", async () => {
      const runnerWithPackageName = await createSdkTestRunner({
        "package-name": "My.Package.Name",
      });
      await runnerWithPackageName.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace Not.My.Package.Name;
      `);

      strictEqual(runnerWithPackageName.context.sdkPackage.name, "My.Package.Name");
    });
    it("from namespace", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Package.Name;
      `);

      strictEqual(runner.context.sdkPackage.name, "My.Package.Name");
    });
  });
  describe("root namespace", () => {
    it("basic namespace", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Namespace;
      `);

      strictEqual(runner.context.sdkPackage.rootNamespace, "My.Namespace");
    });

    it("nested namespaces", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Namespace {};

        @client({name: "MySecondClient"})
        @service({})
        namespace My.Namespace.Sub {};
      `);

      strictEqual(runner.context.sdkPackage.rootNamespace, "My.Namespace");
    });
  });
  describe("SdkClientType", () => {
    it("name", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace NotMyClient;
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      strictEqual(sdkPackage.clients[0].name, "MyClient");
      strictEqual(sdkPackage.clients[0].kind, "client");
    });
    it("initialization default endpoint no credential", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.initialization.name, "ServiceClientOptions");
      strictEqual(client.initialization.properties.length, 1);
      const endpointParam = client.initialization.properties[0];
      strictEqual(endpointParam.kind, "endpoint");
      strictEqual(endpointParam.name, "endpoint");
      strictEqual(endpointParam.onClient, true);
      strictEqual(endpointParam.optional, true);
      strictEqual(endpointParam.type.kind, "endpoint");
      strictEqual(endpointParam.type.serverUrl, "http://localhost:3000");
      strictEqual(endpointParam.urlEncode, false);
      strictEqual(endpointParam.type.templateArguments.length, 0);
    });

    it("initialization default endpoint with apikey auth", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({})
        namespace My.Service;
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.initialization.properties.length, 2);

      const endpointParam = client.initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.type.kind, "endpoint");
      strictEqual(endpointParam.type.serverUrl, "http://localhost:3000");
      strictEqual(endpointParam.type.templateArguments.length, 0);

      const credentialParam = client.initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
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
        @service({})
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
      strictEqual(client.initialization.properties.length, 2);

      const endpointParam = client.initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.type.kind, "endpoint");
      strictEqual(endpointParam.type.serverUrl, "http://localhost:3000");
      strictEqual(endpointParam.type.templateArguments.length, 0);

      const credentialParam = client.initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
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
        "https://login.microsoftonline.com/common/oauth2/authorize"
      );
      strictEqual(scheme.flows[0].scopes.length, 1);
      strictEqual(scheme.flows[0].scopes[0].value, "https://security.microsoft.com/.default");
    });

    it("initialization default endpoint with union auth", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key"> | OAuth2Auth<[MyFlow]>)
        @service({})
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
      strictEqual(client.initialization.properties.length, 2);

      const endpointParam = client.initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.type.kind, "endpoint");
      strictEqual(endpointParam.type.serverUrl, "http://localhost:3000");

      const credentialParam = client.initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
      )[0];
      strictEqual(credentialParam.name, "credential");
      strictEqual(credentialParam.onClient, true);
      strictEqual(credentialParam.optional, false);
      strictEqual(credentialParam.type.kind, "union");
      strictEqual(credentialParam.type.name, "ServiceCredentialUnion");
      strictEqual(credentialParam.type.isGeneratedName, true);
      strictEqual(credentialParam.type.values.length, 2);
      const schemes = credentialParam.type.values
        .filter((v): v is SdkCredentialType => v.kind === "credential")
        .map((s) => s.scheme);
      strictEqual(schemes.length, 2);
      const apiKeyScheme = schemes.filter(
        (s): s is ApiKeyAuth<"header", "x-ms-api-key"> => s.type === "apiKey"
      )[0];
      strictEqual(apiKeyScheme.type, "apiKey");
      strictEqual(apiKeyScheme.in, "header");
      strictEqual(apiKeyScheme.name, "x-ms-api-key");

      const oauth2Scheme = schemes.filter(
        (s): s is Oauth2Auth<OAuth2Flow[]> => s.type === "oauth2"
      )[0];
      strictEqual(oauth2Scheme.flows.length, 1);
      strictEqual(oauth2Scheme.flows[0].type, "implicit");
      strictEqual(
        oauth2Scheme.flows[0].authorizationUrl,
        "https://login.microsoftonline.com/common/oauth2/authorize"
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
        @service({})
        namespace My.Service;
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.initialization.properties.length, 2);

      const endpointParam = client.initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
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
      strictEqual(templateArg.description, "Testserver endpoint");

      const credentialParam = client.initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
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
        @service({})
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
      strictEqual(client.initialization.properties.length, 2);
      strictEqual(client.apiVersions.length, 1);
      strictEqual(client.apiVersions[0], "v1.0");

      const endpointParams = client.initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
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
      strictEqual(endpointParamType.kind, "endpoint");
      strictEqual(endpointParamType.serverUrl, "{endpoint}/server/path/multiple/{apiVersion}");

      strictEqual(endpointParamType.templateArguments.length, 2);
      const endpointTemplateArg = endpointParamType.templateArguments[0];
      strictEqual(endpointTemplateArg.name, "endpoint");
      strictEqual(endpointTemplateArg.onClient, true);
      strictEqual(endpointTemplateArg.optional, false);
      strictEqual(endpointTemplateArg.kind, "path");

      const apiVersionParam = endpointParamType.templateArguments[1];
      strictEqual(apiVersionParam.clientDefaultValue, "v1.0");
      strictEqual(apiVersionParam.urlEncode, true);
      strictEqual(apiVersionParam.name, "apiVersion");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.kind, "path");
      deepStrictEqual(client.apiVersions, ["v1.0"]);

      const credentialParam = client.initialization.properties.find(
        (p): p is SdkCredentialParameter => p.kind === "credential"
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

    it("single with core", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @versioned(MyVersions)
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({name: "Service"})
        namespace My.Service;

        @doc("The version of the API.")
        enum MyVersions {
          @doc("The version 2022-12-01-preview.")
          @useDependency(Versions.v1_0_Preview_2)
          v2022_12_01_preview: "2022-12-01-preview",
        }

        @resource("users")
        @doc("Details about a user.")
        model User {
          @key
          @doc("The user's id.")
          @visibility("read")
          id: int32;

          @doc("The user's name.")
          name: string;
        }

        alias ServiceTraits = Traits.SupportsRepeatableRequests & Traits.SupportsConditionalRequests & Traits.SupportsClientRequestId;

        alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

        op delete is Operations.ResourceDelete<User>;
      `);
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.initialization.properties.length, 3);
      strictEqual(client.apiVersions.length, 1);
      strictEqual(client.apiVersions[0], "2022-12-01-preview");

      const endpointParam = client.initialization.properties.find((x) => x.kind === "endpoint");
      ok(endpointParam);
      strictEqual(endpointParam.name, "endpoint");
      strictEqual(endpointParam.kind, "endpoint");
      strictEqual(endpointParam.optional, true);
      strictEqual(endpointParam.onClient, true);
      strictEqual(endpointParam.type.kind, "endpoint");
      strictEqual(endpointParam.type.serverUrl, "http://localhost:3000");

      const apiVersionParam = client.initialization.properties.filter(
        (p) => p.isApiVersionParam
      )[0];
      strictEqual(apiVersionParam.name, "apiVersion");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.kind, "method");
      strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01-preview");
    });

    it("multiple with core", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @versioned(MyVersions)
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({name: "Service"})
        namespace My.Service;

        @doc("The version of the API.")
        enum MyVersions {
          @doc("The version 2022-12-01-preview.")
          @useDependency(Versions.v1_0_Preview_2)
          v2022_12_01_preview: "2022-12-01-preview",
          @doc("The version 2022-12-01.")
          @useDependency(Versions.v1_0_Preview_2)
          v2022_12_01: "2022-12-01",
        }

        @resource("users")
        @doc("Details about a user.")
        model User {
          @key
          @doc("The user's id.")
          @visibility("read")
          id: int32;

          @doc("The user's name.")
          name: string;
        }

        alias ServiceTraits = Traits.SupportsRepeatableRequests & Traits.SupportsConditionalRequests & Traits.SupportsClientRequestId;

        alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
        op get is Operations.ResourceRead<User>;

        op delete is Operations.ResourceDelete<User>;
      `);
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.initialization.properties.length, 3);
      strictEqual(client.apiVersions.length, 2);
      deepStrictEqual(client.apiVersions, ["2022-12-01-preview", "2022-12-01"]);

      const endpointParam = client.initialization.properties.find((x) => x.kind === "endpoint");
      ok(endpointParam);
      strictEqual(endpointParam.type.kind, "endpoint");
      strictEqual(endpointParam.type.serverUrl, "http://localhost:3000");

      const apiVersionParam = client.initialization.properties.filter(
        (p) => p.isApiVersionParam
      )[0];
      strictEqual(apiVersionParam.name, "apiVersion");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.kind, "method");
      strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01");
    });

    it("namespace", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({name: "ServiceOne"})
        namespace My.Service.One {};

        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({name: "ServiceTwo"})
        namespace My.Service.Two {};
      `);
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 2);
      const clientOne = sdkPackage.clients.filter((c) => c.name === "OneClient")[0];
      strictEqual(clientOne.nameSpace, "My.Service.One");

      const clientTwo = sdkPackage.clients.filter((c) => c.name === "TwoClient")[0];
      strictEqual(clientTwo.nameSpace, "My.Service.Two");
    });

    it("operationGroup", async () => {
      await runner.compileWithBuiltInService(`
        @operationGroup
        namespace MyOperationGroup {
          op func(): void;
        }
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const mainClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
      const operationGroup = mainClient?.methods.find((c) => c.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      ok(mainClient && operationGroup);

      strictEqual(mainClient.methods.length, 1);
      strictEqual(mainClient.initialization.properties.length, 1);
      strictEqual(mainClient.initialization.properties[0].name, "endpoint");

      const clientAccessor = mainClient.methods[0];
      strictEqual(clientAccessor.kind, "clientaccessor");
      strictEqual(clientAccessor.access, "internal");
      strictEqual(clientAccessor.name, "getMyOperationGroup");
      strictEqual(clientAccessor.parameters.length, 0);
      strictEqual(clientAccessor.response, operationGroup);
      strictEqual(clientAccessor.crossLanguageDefintionId, "TestService.MyOperationGroup");

      strictEqual(operationGroup.initialization.properties.length, 1);
      strictEqual(operationGroup.initialization.access, "internal");
      strictEqual(operationGroup.methods.length, 1);
      strictEqual(operationGroup.methods[0].name, "func");
      strictEqual(
        operationGroup.methods[0].crossLanguageDefintionId,
        "TestService.MyOperationGroup.func"
      );
    });

    it("operationGroup2", async () => {
      await runner.compileWithBuiltInService(`
        namespace Foo {
          interface Bar {
            @route("/one")
            one(): void;
          }
        }
        interface Bar {
          @route("/two")
          two(): void;
        }
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const mainClient = sdkPackage.clients[0];
      const fooClient = mainClient.methods.find(
        (m) => m.kind === "clientaccessor" && m.name === "getFoo"
      )?.response as SdkClientType<SdkHttpOperation>;
      const fooBarClient = fooClient.methods.find((m) => m.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      const barClient = mainClient.methods.find(
        (m) => m.kind === "clientaccessor" && m.name === "getBar"
      )?.response as SdkClientType<SdkHttpOperation>;
      ok(mainClient && fooClient && fooBarClient && barClient);

      strictEqual(mainClient.methods.length, 2);
      ok(mainClient.initialization);
      strictEqual(mainClient.initialization.properties.length, 1);
      strictEqual(mainClient.initialization.properties[0].name, "endpoint");

      const fooAccessor = mainClient.methods[0];
      strictEqual(fooAccessor.kind, "clientaccessor");
      strictEqual(fooAccessor.crossLanguageDefintionId, "TestService.Foo");
      strictEqual(fooAccessor.access, "internal");
      strictEqual(fooAccessor.name, "getFoo");
      strictEqual(fooAccessor.parameters.length, 0);
      strictEqual(fooAccessor.response, fooClient);

      const barAccessor = mainClient.methods[1];
      strictEqual(barAccessor.kind, "clientaccessor");
      strictEqual(barAccessor.access, "internal");
      strictEqual(barAccessor.name, "getBar");
      strictEqual(barAccessor.crossLanguageDefintionId, "TestService.Bar");
      strictEqual(barAccessor.parameters.length, 0);
      strictEqual(barAccessor.response, barClient);

      strictEqual(fooClient.initialization.properties.length, 1);
      strictEqual(fooClient.initialization.access, "internal");
      strictEqual(fooClient.methods.length, 1);

      const fooBarAccessor = fooClient.methods[0];
      strictEqual(fooBarAccessor.kind, "clientaccessor");
      strictEqual(fooBarAccessor.crossLanguageDefintionId, "TestService.Foo.Bar");
      strictEqual(fooBarAccessor.access, "internal");
      strictEqual(fooBarAccessor.name, "getBar");
      strictEqual(fooBarAccessor.parameters.length, 0);
      strictEqual(fooBarAccessor.response, fooBarClient);

      strictEqual(fooBarClient.initialization.properties.length, 1);
      strictEqual(fooBarClient.initialization.access, "internal");
      strictEqual(fooBarClient.methods.length, 1);
      strictEqual(fooBarClient.methods[0].kind, "basic");
      strictEqual(fooBarClient.methods[0].name, "one");
      strictEqual(fooBarClient.methods[0].crossLanguageDefintionId, "TestService.Foo.Bar.one");

      strictEqual(barClient.initialization.properties.length, 1);
      strictEqual(barClient.initialization.access, "internal");
      strictEqual(barClient.methods.length, 1);
      strictEqual(barClient.methods[0].kind, "basic");
      strictEqual(barClient.methods[0].name, "two");
      strictEqual(barClient.methods[0].crossLanguageDefintionId, "TestService.Bar.two");
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
    @service({})
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
        `)
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization.properties.length, 1);
      strictEqual(client.initialization.properties[0].name, "endpoint");

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
        `)
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];

      strictEqual(client.initialization.properties.length, 2);
      strictEqual(client.initialization.properties[0].name, "endpoint");
      const clientApiVersionParam = client.initialization.properties[1];
      strictEqual(clientApiVersionParam.name, "apiVersion");
      strictEqual(clientApiVersionParam.onClient, true);
      strictEqual(clientApiVersionParam.optional, false);
      strictEqual(clientApiVersionParam.kind, "method");
      strictEqual(clientApiVersionParam.clientDefaultValue, undefined);
      strictEqual(clientApiVersionParam.isApiVersionParam, true);
      strictEqual(clientApiVersionParam.type.kind, "string");

      strictEqual(sdkPackage.clients[0].methods.length, 1);
      const withApiVersion = sdkPackage.clients[0].methods[0];
      strictEqual(withApiVersion.kind, "basic");
      strictEqual(withApiVersion.parameters.length, 1);
      strictEqual(withApiVersion.operation.parameters[0].name, "apiVersion");
      strictEqual(withApiVersion.operation.parameters[0].isApiVersionParam, true);
      strictEqual(withApiVersion.operation.parameters.length, 1);

      const apiVersionParam = withApiVersion.operation.parameters[0];
      strictEqual(apiVersionParam.kind, "query");
      strictEqual(apiVersionParam.isApiVersionParam, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.type.kind, "string");
      strictEqual(apiVersionParam.clientDefaultValue, undefined);
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
      `)
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization.properties.length, 1);
      strictEqual(client.initialization.properties[0].name, "endpoint");

      const withoutApiVersion = client.methods[0];
      strictEqual(withoutApiVersion.kind, "basic");
      strictEqual(withoutApiVersion.parameters.length, 0);
      strictEqual(withoutApiVersion.operation.parameters.length, 0);
      strictEqual(
        withoutApiVersion.crossLanguageDefintionId,
        "Server.Versions.Versioned.withoutApiVersion"
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
      `)
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization.properties.length, 2);
      strictEqual(client.initialization.properties[0].name, "endpoint");

      const clientApiVersionParam = client.initialization.properties[1];
      strictEqual(clientApiVersionParam.name, "apiVersion");
      strictEqual(clientApiVersionParam.onClient, true);
      strictEqual(clientApiVersionParam.optional, false);
      strictEqual(clientApiVersionParam.kind, "method");
      strictEqual(clientApiVersionParam.clientDefaultValue, "2022-12-01-preview");
      strictEqual(clientApiVersionParam.isApiVersionParam, true);
      strictEqual(clientApiVersionParam.type.kind, "string");
      strictEqual(client.methods.length, 1);

      const withApiVersion = client.methods[0];
      strictEqual(withApiVersion.name, "withQueryApiVersion");
      strictEqual(withApiVersion.kind, "basic");
      strictEqual(
        withApiVersion.crossLanguageDefintionId,
        "Server.Versions.Versioned.withQueryApiVersion"
      );
      strictEqual(withApiVersion.parameters.length, 1);
      strictEqual(withApiVersion.operation.parameters.length, 1);
      strictEqual(withApiVersion.parameters[0].isApiVersionParam, true);
      strictEqual(withApiVersion.parameters[0].name, "apiVersion");

      const apiVersionParam = withApiVersion.operation.parameters[0];
      strictEqual(apiVersionParam.kind, "query");
      strictEqual(apiVersionParam.isApiVersionParam, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.type.kind, "string");
      strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01-preview");
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
      `)
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization.properties.length, 2);
      strictEqual(client.initialization.properties[0].name, "endpoint");

      const clientApiVersionParam = client.initialization.properties[1];
      strictEqual(clientApiVersionParam.name, "apiVersion");
      strictEqual(clientApiVersionParam.onClient, true);
      strictEqual(clientApiVersionParam.optional, false);
      strictEqual(clientApiVersionParam.kind, "method");
      strictEqual(clientApiVersionParam.clientDefaultValue, "2022-12-01-preview");
      strictEqual(clientApiVersionParam.isApiVersionParam, true);
      strictEqual(clientApiVersionParam.type.kind, "string");
      strictEqual(client.methods.length, 1);

      const withApiVersion = client.methods[0];
      strictEqual(withApiVersion.name, "withPathApiVersion");
      strictEqual(withApiVersion.kind, "basic");
      strictEqual(
        withApiVersion.crossLanguageDefintionId,
        "Server.Versions.Versioned.withPathApiVersion"
      );
      strictEqual(withApiVersion.parameters.length, 1);
      strictEqual(withApiVersion.parameters[0].isApiVersionParam, true);
      strictEqual(withApiVersion.parameters[0].name, "apiVersion");
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
    });
  });
  describe("Parameters", () => {
    it("path basic", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@path path: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.crossLanguageDefintionId, "My.Service.myOp");
      strictEqual(method.parameters.length, 1);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "path");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParam, undefined);
      strictEqual(serviceOperation.exceptions.get("*"), undefined);

      strictEqual(serviceOperation.parameters.length, 1);
      const pathParam = serviceOperation.parameters[0];

      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "path");
      strictEqual(pathParam.name, "path");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");
      strictEqual(pathParam.urlEncode, true);
      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type, undefined);

      const correspondingMethodParams = pathParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.name, correspondingMethodParams[0].name);
    });

    it("path basic with null", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@path path: string | null): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const methodParam = method.parameters[0];
      strictEqual(methodParam.type.kind, "nullable");

      const serviceOperation = method.operation;
      const pathParam = serviceOperation.parameters[0];
      strictEqual(pathParam.type.kind, "nullable");
    });

    it("path defined in model", async () => {
      await runner.compileWithBuiltInService(`
      @route("{name}")
      @put
      op pathInModel(...NameParameter): void;

      model NameParameter {
        @doc("Name parameter")
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @format("UUID")
        name: string;
      }
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "pathInModel");
      strictEqual(method.kind, "basic");
      strictEqual(method.crossLanguageDefintionId, "TestService.pathInModel");
      strictEqual(method.parameters.length, 1);
      const pathMethod = method.parameters[0];
      strictEqual(pathMethod.kind, "method");
      strictEqual(pathMethod.name, "name");
      strictEqual(pathMethod.optional, false);
      strictEqual(pathMethod.onClient, false);
      strictEqual(pathMethod.isApiVersionParam, false);
      strictEqual(pathMethod.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParam, undefined);
      strictEqual(serviceOperation.parameters.length, 1);
      const pathParam = serviceOperation.parameters[0];
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "name");
      strictEqual(pathParam.name, "name");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");
      strictEqual(pathParam.urlEncode, true);
      strictEqual(pathParam.correspondingMethodParams.length, 1);
      deepStrictEqual(pathParam.correspondingMethodParams[0], pathMethod);
    });

    it("header basic", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header header: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.crossLanguageDefintionId, "My.Service.myOp");
      strictEqual(method.parameters.length, 1);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "header");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParam, undefined);
      strictEqual(serviceOperation.exceptions.get("*"), undefined);

      strictEqual(serviceOperation.parameters.length, 1);
      const headerParam = serviceOperation.parameters[0];

      strictEqual(headerParam.kind, "header");
      strictEqual(headerParam.serializedName, "header");
      strictEqual(headerParam.name, "header");
      strictEqual(headerParam.optional, false);
      strictEqual(headerParam.onClient, false);
      strictEqual(headerParam.isApiVersionParam, false);
      strictEqual(headerParam.type.kind, "string");
      strictEqual(headerParam.collectionFormat, undefined);

      const correspondingMethodParams = headerParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(headerParam.name, correspondingMethodParams[0].name);
    });

    it("header basic with null", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header header: string | null): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const methodParam = method.parameters[0];
      strictEqual(methodParam.type.kind, "nullable");

      const serviceOperation = method.operation;
      const headerParam = serviceOperation.parameters[0];
      strictEqual(headerParam.type.kind, "nullable");
    });

    it("header collection format", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header({format: "multi"}) header: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.kind, "basic");

      strictEqual(method.operation.parameters.length, 1);
      const headerParam = method.operation.parameters[0];
      strictEqual(headerParam.kind, "header");
      strictEqual(headerParam.collectionFormat, "multi");
    });

    it("query basic", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@query query: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "query");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParam, undefined);
      strictEqual(serviceOperation.exceptions.get("*"), undefined);

      strictEqual(serviceOperation.parameters.length, 1);
      const queryParam = serviceOperation.parameters[0];
      strictEqual(queryParam.kind, "query");
      strictEqual(queryParam.serializedName, "query");
      strictEqual(queryParam.name, "query");
      strictEqual(queryParam.optional, false);
      strictEqual(queryParam.onClient, false);
      strictEqual(queryParam.isApiVersionParam, false);
      strictEqual(queryParam.type.kind, "string");
      strictEqual(queryParam.collectionFormat, undefined);

      const correspondingMethodParams = queryParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(queryParam.name, correspondingMethodParams[0].name);
    });

    it("query basic with null", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@query query: string | null): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const methodParam = method.parameters[0];
      strictEqual(methodParam.type.kind, "nullable");

      const serviceOperation = method.operation;
      const queryParam = serviceOperation.parameters[0];
      strictEqual(queryParam.type.kind, "nullable");
    });

    it("query collection format", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@query({format: "multi"}) query: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.kind, "basic");

      strictEqual(method.operation.parameters.length, 1);
      const queryParm = method.operation.parameters[0];
      strictEqual(queryParm.kind, "query");
      strictEqual(queryParm.collectionFormat, "multi");
    });

    it("body basic", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(@body body: Input): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.models[0].name, "Input");
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodBodyParam = method.parameters.find((x) => x.name === "body");
      ok(methodBodyParam);
      strictEqual(methodBodyParam.kind, "method");
      strictEqual(methodBodyParam.optional, false);
      strictEqual(methodBodyParam.onClient, false);
      strictEqual(methodBodyParam.isApiVersionParam, false);
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.type.kind, "constant");
      strictEqual(methodContentTypeParam.onClient, false);
      strictEqual(methodContentTypeParam.optional, false);

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);

      const correspondingMethodParams = bodyParameter.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(bodyParameter.name, correspondingMethodParams[0].name);

      strictEqual(serviceOperation.parameters.length, 1);
      const contentTypeParam = serviceOperation.parameters[0];
      strictEqual(contentTypeParam.name, "contentType");
      strictEqual(contentTypeParam.serializedName, "Content-Type");
      strictEqual(contentTypeParam.clientDefaultValue, undefined);
      strictEqual(contentTypeParam.onClient, false);
      strictEqual(contentTypeParam.optional, false);

      const correspondingContentTypeMethodParams = contentTypeParam.correspondingMethodParams;
      strictEqual(correspondingContentTypeMethodParams.length, 1);
      strictEqual(correspondingContentTypeMethodParams[0], methodContentTypeParam);
    });

    it("body basic with null", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(@body body: Input | null): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const methodBodyParam = method.parameters.find((x) => x.name === "body");
      ok(methodBodyParam);
      strictEqual(methodBodyParam.type.kind, "nullable");

      const serviceOperation = method.operation;
      ok(serviceOperation.bodyParam);
      strictEqual(serviceOperation.bodyParam.type.kind, "nullable");
    });

    it("body optional", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(@body body?: Input): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.models[0].name, "Input");
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodBodyParam = method.parameters.find((x) => x.name === "body");
      ok(methodBodyParam);
      strictEqual(methodBodyParam.kind, "method");
      strictEqual(methodBodyParam.optional, true);
      strictEqual(methodBodyParam.onClient, false);
      strictEqual(methodBodyParam.isApiVersionParam, false);
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.type.kind, "constant");
      strictEqual(methodContentTypeParam.onClient, false);
      strictEqual(methodContentTypeParam.optional, false);

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, true);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);

      const correspondingMethodParams = bodyParameter.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(bodyParameter.name, correspondingMethodParams[0].name);

      strictEqual(serviceOperation.parameters.length, 1);
      const contentTypeParam = serviceOperation.parameters[0];
      strictEqual(contentTypeParam.name, "contentType");
      strictEqual(contentTypeParam.serializedName, "Content-Type");
      strictEqual(contentTypeParam.clientDefaultValue, undefined);
      strictEqual(contentTypeParam.onClient, false);
      strictEqual(contentTypeParam.optional, false);

      const correspondingContentTypeMethodParams = contentTypeParam.correspondingMethodParams;
      strictEqual(correspondingContentTypeMethodParams.length, 1);
      strictEqual(correspondingContentTypeMethodParams[0], methodContentTypeParam);
    });

    it("parameter grouping", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model RequestOptions {
          @header header: string;
          @query query: string;
          @body body: string;
        };

        op myOp(options: RequestOptions): void;
        `);

      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "options");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "model");
      strictEqual(methodParam.type.properties.length, 3);

      const model = methodParam.type;
      strictEqual(model.properties[0].kind, "header");
      strictEqual(model.properties[0].name, "header");
      strictEqual(model.properties[0].optional, false);
      strictEqual(model.properties[0].onClient, false);
      strictEqual(model.properties[0].isApiVersionParam, false);
      strictEqual(model.properties[0].type.kind, "string");

      strictEqual(model.properties[1].kind, "query");
      strictEqual(model.properties[1].name, "query");
      strictEqual(model.properties[1].optional, false);
      strictEqual(model.properties[1].onClient, false);
      strictEqual(model.properties[1].isApiVersionParam, false);
      strictEqual(model.properties[1].type.kind, "string");

      strictEqual(model.properties[2].kind, "body");
      strictEqual(model.properties[2].name, "body");
      strictEqual(model.properties[2].optional, false);
      strictEqual(model.properties[2].onClient, false);
      strictEqual(model.properties[2].isApiVersionParam, false);
      strictEqual(model.properties[2].type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "contentType");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "constant");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 3);

      ok(serviceOperation.bodyParam);
      const correspondingBodyParams = serviceOperation.bodyParam.correspondingMethodParams;
      strictEqual(correspondingBodyParams.length, 1);
      strictEqual(correspondingBodyParams[0].name, "body");

      const parameters = serviceOperation.parameters;
      strictEqual(parameters.length, 3);

      const headerParams = parameters.filter((x): x is SdkHeaderParameter => x.kind === "header");
      strictEqual(headerParams.length, 2);
      let correspondingHeaderParams = headerParams[0].correspondingMethodParams;
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].name, "header");

      correspondingHeaderParams = headerParams[1].correspondingMethodParams;
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].name, "contentType");

      const queryParams = parameters.filter((x): x is SdkQueryParameter => x.kind === "query");
      strictEqual(queryParams.length, 1);
      const correspondingQueryParams = queryParams[0].correspondingMethodParams;
      strictEqual(correspondingQueryParams.length, 1);
      strictEqual(correspondingQueryParams[0].name, "query");
    });

    it("content type", async () => {
      await runner.compileWithBuiltInService(`
      @patch op patchNull(@body body: string): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "patchNull");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "body");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "contentType");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "constant");
      strictEqual(methodParam.type.value, "application/json");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);

      ok(serviceOperation.bodyParam);
      const correspondingBodyParams = serviceOperation.bodyParam.correspondingMethodParams;
      strictEqual(correspondingBodyParams.length, 1);
      strictEqual(correspondingBodyParams[0].name, "body");

      strictEqual(serviceOperation.parameters.length, 1);
      const correspondingHeaderParams = serviceOperation.parameters[0].correspondingMethodParams;
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].name, "contentType");
    });
    it("ensure content type is a constant if only one possibility", async () => {
      await runner.compileWithBuiltInService(`
      model DefaultDatetimeProperty {
        value: utcDateTime;
      }
      @post op default(@body body: DefaultDatetimeProperty): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 2);
      const methodBodyParam = method.parameters[0];
      strictEqual(methodBodyParam.name, "body");
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters[1];
      strictEqual(methodContentTypeParam.name, "contentType");

      const serviceOperation = method.operation;
      const serviceBodyParam = serviceOperation.bodyParam;
      ok(serviceBodyParam);
      strictEqual(serviceBodyParam.kind, "body");
      strictEqual(serviceBodyParam.contentTypes.length, 1);
      strictEqual(serviceBodyParam.defaultContentType, "application/json");
      strictEqual(serviceBodyParam.contentTypes[0], "application/json");
      deepStrictEqual(serviceBodyParam.correspondingMethodParams[0], methodBodyParam);

      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.name, "contentType");
      strictEqual(serviceContentTypeParam.serializedName, "Content-Type");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "application/json");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");
      deepStrictEqual(serviceContentTypeParam.correspondingMethodParams[0], methodContentTypeParam);
    });

    it("ensure accept is a constant if only one possibility (json)", async () => {
      await runner.compileWithBuiltInService(`
      model DefaultDatetimeProperty {
        value: utcDateTime;
      }
      @get op default(): DefaultDatetimeProperty;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 1);
      const methodAcceptParam = method.parameters[0];
      strictEqual(methodAcceptParam.name, "accept");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.name, "accept");
      strictEqual(serviceContentTypeParam.serializedName, "Accept");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "application/json");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");

      strictEqual(serviceOperation.responses.size, 1);
      const response = serviceOperation.responses.get(200);
      ok(response);
      strictEqual(response.kind, "http");
      strictEqual(response.type, sdkPackage.models[0]);
      strictEqual(response.contentTypes?.length, 1);
      strictEqual(response.contentTypes[0], "application/json");
      strictEqual(response.defaultContentType, "application/json");

      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type, sdkPackage.models[0]);
    });

    it("ensure accept is a constant if only one possibility (non-json)", async () => {
      await runner.compileWithBuiltInService(`
      @get op default(): {
        @header
        contentType: "image/png";
    
        @body
        value: bytes;
      };
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 1);
      const methodAcceptParam = method.parameters[0];
      strictEqual(methodAcceptParam.name, "accept");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.name, "accept");
      strictEqual(serviceContentTypeParam.serializedName, "Accept");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "image/png");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");

      strictEqual(serviceOperation.responses.size, 1);
      const response = serviceOperation.responses.get(200);
      ok(response);
      strictEqual(response.kind, "http");
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(response.contentTypes?.length, 1);
      strictEqual(response.contentTypes[0], "image/png");
      strictEqual(response.defaultContentType, "image/png");

      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type?.kind, "bytes");
    });

    it("lro rpc case", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(
        getServiceWithDefaultApiVersion(`
        model GenerationOptions {
          prompt: string;
        }
        
        model GenerationResponse is Azure.Core.Foundations.OperationStatus<GenerationResult>;
        
        model GenerationResult {
          data: string;
        }
        
        @route("/generations:submit")
        op longRunningRpc is Azure.Core.LongRunningRpcOperation<GenerationOptions, GenerationResponse, GenerationResult>;
      `)
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 4);
      deepStrictEqual(
        method.parameters.map((x) => x.name),
        ["apiVersion", "prompt", "contentType", "accept"]
      );
    });

    it("never void parameter or response", async () => {
      await runner.compileWithBuiltInService(`
        op TestTemplate<
          headerType,
          queryType,
          bodyType,
          responseHeaderType,
          responseBodyType
        >(@header h: headerType, @query q: queryType, @body b: bodyType): {
          @header h: responseHeaderType;
          @body b: responseBodyType;
        };
        op test is TestTemplate<void, void, void, void, void>;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.parameters.length, 0);
      strictEqual(method.response.type, undefined);
      strictEqual(method.operation.parameters.length, 0);
      strictEqual(method.operation.responses.get(200)?.headers.length, 0);
      strictEqual(method.operation.responses.get(200)?.type, undefined);
    });
  });

  describe("Responses", () => {
    it("basic returning void", async () => {
      await runner.compileWithBuiltInService(
        `
        @error
        model Error {
          code: int32;
          message: string;
        }
        @delete op delete(@path id: string): void | Error;
        `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "delete");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.size, 1);

      const voidResponse = serviceResponses.get(204);
      ok(voidResponse);
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions.get("*");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(errorResponse.type, sdkPackage.models[0]);

      strictEqual(method.response.type, undefined);
      strictEqual(method.response.resultPath, undefined);
    });
    it("basic returning void and error model has status code", async () => {
      await runner.compileWithBuiltInService(
        `
        @error
        model Error {
          @statusCode _: 403;
          code: int32;
          message: string;
        }
        @delete op delete(@path id: string): void | Error;
        `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "delete");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.size, 1);

      const voidResponse = serviceResponses.get(204);
      ok(voidResponse);
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions.get(403);
      ok(errorResponse);
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(errorResponse.type, sdkPackage.models[0]);

      strictEqual(method.response.type, undefined);
      strictEqual(method.response.resultPath, undefined);
    });
    it("basic returning model", async () => {
      await runner.compileWithBuiltInService(
        `
      model Widget {
        @visibility("read", "update")
        @path
        id: string;

        weight: int32;
        color: "red" | "blue";
      }

      @error
      model Error {
        code: int32;
        message: string;
      }
      @post op create(...Widget): Widget | Error;
      `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 3);
      strictEqual(method.name, "create");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.size, 1);

      const createResponse = serviceResponses.get(200);
      ok(createResponse);
      strictEqual(createResponse.kind, "http");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(createResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions.get("*");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(
        errorResponse.type,
        sdkPackage.models.find((x) => x.name === "Error")
      );

      strictEqual(method.response.kind, "method");
      const methodResponseType = method.response.type;
      strictEqual(methodResponseType, createResponse.type);
      strictEqual(method.response.resultPath, undefined);
    });

    it("Headers and body", async () => {
      await runner.compileWithBuiltInService(
        `
        model Widget {
          @header id: string;
          weight: int32;
        }
  
        op operation(): Widget;
        `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "operation");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.size, 1);

      strictEqual(method.parameters.length, 1);

      const createResponse = serviceResponses.get(200);
      ok(createResponse);
      strictEqual(createResponse.kind, "http");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(createResponse.headers.length, 1);
      strictEqual(createResponse.headers[0].serializedName, "id");

      strictEqual(method.response.kind, "method");
      strictEqual(method.response.resultPath, undefined);
      const methodResponseType = method.response.type;
      ok(methodResponseType);
      strictEqual(
        methodResponseType,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(methodResponseType.properties.length, 2);
      strictEqual(methodResponseType.properties.filter((x) => x.kind === "header").length, 1);
    });

    it("Headers and body with null", async () => {
      await runner.compileWithBuiltInService(
        `
      model Widget {
        weight: int32;
      }

      op operation(): {@header id: string | null, @body body: Widget | null};
      `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const serviceResponses = method.operation.responses;

      const createResponse = serviceResponses.get(200);
      ok(createResponse);
      strictEqual(createResponse.headers[0].type.kind, "nullable");
      strictEqual(createResponse.type?.kind, "nullable");
      strictEqual(method.response.type?.kind, "nullable");
    });

    it("OkResponse with NoContentResponse", async () => {
      await runner.compileWithBuiltInService(
        `
      model Widget {
        weight: int32;
      }

      op operation(): Widget | NoContentResponse;
      `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const serviceResponses = method.operation.responses;

      const okResponse = serviceResponses.get(200);
      ok(okResponse);

      const noContentResponse = serviceResponses.get(204);
      ok(noContentResponse);
      strictEqual(noContentResponse.type, undefined);
      strictEqual(method.response.type?.kind, "nullable");
      strictEqual(
        method.response.type?.type,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
    });

    it("NoContentResponse", async () => {
      await runner.compileWithBuiltInService(
        `
        @delete op delete(@path id: string): NoContentResponse;
        `
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "delete");
      strictEqual(method.response.type, undefined);
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.size, 1);

      const voidResponse = serviceResponses.get(204);
      ok(voidResponse);
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);
      strictEqual(voidResponse.contentTypes, undefined);

      strictEqual(method.response.type, undefined);
      strictEqual(method.response.resultPath, undefined);
    });
  });
  describe("Vanilla Widget Service", () => {
    async function compileVanillaWidgetService(runner: SdkTestRunner, code: string) {
      return await runner.compile(`
      @service({
        title: "Widget Service",
      })
      @versioned(Versions)
      namespace DemoService;

      /** The Contoso Widget Manager service version. */
      enum Versions {
        "2022-08-30",
      }

      model Widget {
        @visibility("read", "update")
        @path
        id: string;

        weight: int32;
        color: "red" | "blue";
      }

      @error
      model Error {
        code: int32;
        message: string;
      }

      @route("/widgets")
      @tag("Widgets")
      interface Widgets {
        ${code}
      }`);
    }

    it("vanilla widget create", async () => {
      await compileVanillaWidgetService(runner, "@post create(...Widget): Widget | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "create");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 5);
      deepStrictEqual(
        method.parameters.map((x) => x.name),
        ["id", "weight", "color", "contentType", "accept"]
      );

      const bodyParameter = method.operation.bodyParam;
      ok(bodyParameter);
      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.name, "createRequest");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(bodyParameter.type.name, "CreateRequest");
      strictEqual(bodyParameter.type.properties.length, 2);
      strictEqual(bodyParameter.correspondingMethodParams.length, 2);

      strictEqual(method.operation.parameters.length, 2);

      const headerParams = method.operation.parameters.filter(
        (x): x is SdkHeaderParameter => x.kind === "header"
      );
      strictEqual(headerParams.length, 2);
      const contentTypeOperationParam = headerParams.find(
        (x) => x.serializedName === "Content-Type"
      );
      ok(contentTypeOperationParam);
      strictEqual(contentTypeOperationParam.clientDefaultValue, undefined);
      strictEqual(contentTypeOperationParam.onClient, false);
      strictEqual(contentTypeOperationParam.optional, false);

      const contentTypeMethodParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeMethodParam);
      strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
      strictEqual(contentTypeMethodParam.onClient, false);
      strictEqual(contentTypeMethodParam.optional, false);

      strictEqual(contentTypeOperationParam.correspondingMethodParams[0], contentTypeMethodParam);

      const acceptOperationParam = headerParams.find((x) => x.serializedName === "Accept");
      ok(acceptOperationParam);
      strictEqual(acceptOperationParam.clientDefaultValue, undefined);
      strictEqual(acceptOperationParam.clientDefaultValue, undefined);
      strictEqual(acceptOperationParam.onClient, false);
      strictEqual(acceptOperationParam.optional, false);

      const acceptMethodParam = method.parameters.find((x) => x.name === "accept");
      ok(acceptMethodParam);
      strictEqual(acceptMethodParam.clientDefaultValue, undefined);
      strictEqual(acceptMethodParam.onClient, false);
      strictEqual(acceptMethodParam.optional, false);

      strictEqual(acceptOperationParam.correspondingMethodParams[0], acceptMethodParam);
    });
    it("vanilla widget read", async () => {
      await compileVanillaWidgetService(runner, "@get read(@path id: string): Widget | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "read");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodIdParam = method.parameters.find((x) => x.name === "id");
      ok(methodIdParam);
      strictEqual(methodIdParam.kind, "method");
      strictEqual(methodIdParam.optional, false);
      strictEqual(methodIdParam.onClient, false);
      strictEqual(methodIdParam.isApiVersionParam, false);
      strictEqual(methodIdParam.type.kind, "string");

      const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);

      const serviceOperation = method.operation;

      strictEqual(serviceOperation.parameters.length, 2);
      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.name, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const operationAcceptParam = serviceOperation.parameters.find(
        (x) => x.kind === "header" && x.serializedName === "Accept"
      );
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);

      strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

      const correspondingMethodParams = pathParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.name, correspondingMethodParams[0].name);
    });
    it("vanilla widget update", async () => {
      await compileVanillaWidgetService(runner, "@patch update(...Widget): Widget | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "update");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 5);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "id");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "weight");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "int32");

      methodParam = method.parameters[2];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "color");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "enum");

      const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.optional, false);

      const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);
      strictEqual(methodAcceptParam.optional, false);

      const serviceOperation = method.operation;

      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.name, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);

      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(
        bodyParameter.type,
        sdkPackage.models.filter((m) => m.name === "UpdateRequest")[0]
      );

      const headerParams = serviceOperation.parameters.filter(
        (x): x is SdkHeaderParameter => x.kind === "header"
      );
      const operationContentTypeParam = headerParams.find(
        (x) => x.serializedName === "Content-Type"
      );
      ok(operationContentTypeParam);
      strictEqual(operationContentTypeParam.clientDefaultValue, undefined);
      strictEqual(operationContentTypeParam.optional, false);

      const operationAcceptParam = headerParams.find((x) => x.serializedName === "Accept");
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);
      strictEqual(operationAcceptParam.optional, false);

      const correspondingMethodParams = bodyParameter.correspondingMethodParams.map((x) => x.name);
      deepStrictEqual(correspondingMethodParams, ["weight", "color"]);

      strictEqual(operationContentTypeParam.correspondingMethodParams[0], methodContentTypeParam);
      strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);
    });
    it("vanilla widget delete", async () => {
      await compileVanillaWidgetService(runner, "@delete delete(@path id: string): void | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "delete");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "id");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;

      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.name, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const correspondingMethodParams = pathParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.name, correspondingMethodParams[0].name);
    });
    it("vanilla widget list", async () => {
      await compileVanillaWidgetService(runner, "@get list(): Widget[] | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "list");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);
      strictEqual(method.operation.bodyParam, undefined);
    });
  });
  describe("Azure Widget Service", () => {
    async function compileAzureWidgetService(runner: SdkTestRunner, code: string) {
      return await runner.compile(`
    @useAuth(
      ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
        {
          type: OAuth2FlowType.implicit,
          authorizationUrl: "https://login.contoso.com/common/oauth2/v2.0/authorize",
          scopes: ["https://widget.contoso.com/.default"],
        }
      ]>
    )
    @service({
      title: "Contoso Widget Manager",
    })
    @server(
      "{endpoint}/widget",
      "Contoso Widget APIs",
      {
        @doc("""
    Supported Widget Services endpoints (protocol and hostname, for example:
    https://westus.api.widget.contoso.com).
    """)
        endpoint: string,
      }
    )
    @versioned(Contoso.WidgetManager.Versions)
    namespace Contoso.WidgetManager;

    @doc("The Contoso Widget Manager service version.")
    enum Versions {
      @doc("Version 2022-08-31")
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      "2022-08-30",
    }

    // Models ////////////////////

    @doc("The color of a widget.")
    enum WidgetColor {
      @doc("Black")
      Black,

      @doc("White")
      White,

      @doc("Red")
      Red,

      @doc("Green")
      Green,

      @doc("Blue")
      Blue,
    }

    @doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetName")
      @doc("The widget name.")
      @visibility("read")
      name: string;

      @doc("The widget color.")
      color: WidgetColor;

      @doc("The ID of the widget's manufacturer.")
      manufacturerId: string;

      ...EtagProperty;
    }

    @doc("The repair state of a widget.")
    @lroStatus
    enum WidgetRepairState {
      @doc("Widget repairs succeeded.")
      Succeeded,

      @doc("Widget repairs failed.")
      Failed,

      @doc("Widget repairs were canceled.")
      Canceled,

      @doc("Widget was sent to the manufacturer.")
      SentToManufacturer,
    }

    @doc("A submitted repair request for a widget.")
    model WidgetRepairRequest {
      @doc("The state of the widget repair request.")
      requestState: WidgetRepairState;

      @doc("The date and time when the repair is scheduled to occur.")
      scheduledDateTime: utcDateTime;

      @doc("The date and time when the request was created.")
      createdDateTime: utcDateTime;

      @doc("The date and time when the request was updated.")
      updatedDateTime: utcDateTime;

      @doc("The date and time when the request was completed.")
      completedDateTime: utcDateTime;
    }

    @doc("The parameters for a widget status request")
    model WidgetRepairStatusParams {
      @doc("The ID of the widget being repaired.")
      @path
      widgetId: string;
    }

    @doc("A widget's part.")
    @resource("parts")
    @parentResource(Widget)
    model WidgetPart {
      @key("widgetPartName")
      @doc("The name of the part.")
      @visibility("read")
      name: string;

      @doc("The ID to use for reordering the part.")
      partId: string;

      @doc("The ID of the part's manufacturer.")
      manufacturerId: string;

      ...EtagProperty;
    }

    @doc("The details of a reorder request for a WidgetPart.")
    model WidgetPartReorderRequest {
      @doc("Identifies who signed off the reorder request.")
      signedOffBy: string;
    }

    // An example of a singleton resource
    @doc("Provides analytics about the use and maintenance of a Widget.")
    @resource("analytics")
    @parentResource(Widget)
    model WidgetAnalytics {
      @key("analyticsId")
      @doc("The identifier for the analytics object.  There is only one named 'current'.")
      @visibility("read")
      id: "current";

      @doc("The number of uses of the widget.")
      useCount: int64;

      @doc("The number of times the widget was repaired.")
      repairCount: int64;
    }

    @doc("A manufacturer of widgets.")
    @resource("manufacturers")
    model Manufacturer {
      @key("manufacturerId")
      @doc("The manufacturer's unique ID.")
      @visibility("read")
      id: string;

      @doc("The manufacturer's name.")
      name: string;

      @doc("The manufacturer's full address.")
      address: string;

      ...EtagProperty;
    }

    // Operations ////////////////////

    alias ServiceTraits = SupportsRepeatableRequests &
      SupportsConditionalRequests &
      SupportsClientRequestId;

    alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

    @route("/widgets")
    @tag("Widgets")
    interface Widgets {
      ${code}
    }`);
    }

    it("azure widget getWidget", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await compileAzureWidgetService(
        runnerWithCore,
        `
      @doc("Get a Widget")
      getWidget is Operations.ResourceRead<Widget>;
      `
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      const parentClient = sdkPackage.clients.filter(
        (c) => c.initialization.access === "public"
      )[0];
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(parentClient.name, "WidgetManagerClient");
      strictEqual(method.name, "getWidget");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 8);

      // TODO: what should we do with eTags and client request id?
      const methodWidgetName = method.parameters.find((p) => p.name === "widgetName");
      ok(methodWidgetName);
      strictEqual(methodWidgetName.kind, "method");
      strictEqual(methodWidgetName.isApiVersionParam, false);
      deepStrictEqual(methodWidgetName.apiVersions, ["2022-08-30"]);
      strictEqual(methodWidgetName.onClient, false);
      strictEqual(methodWidgetName.optional, false);

      strictEqual(method.operation.parameters.length, 8);

      const pathParam = method.operation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.name, "widgetName");
      strictEqual(pathParam.serializedName, "widgetName");
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.correspondingMethodParams.length, 1);
      strictEqual(pathParam.correspondingMethodParams[0], methodWidgetName);

      const queryParam = method.operation.parameters.find((x) => x.kind === "query");
      ok(queryParam);
      strictEqual(queryParam.isApiVersionParam, true);
      strictEqual(queryParam.name, "apiVersion");
      strictEqual(queryParam.serializedName, "api-version");
      strictEqual(queryParam.onClient, true);
      strictEqual(queryParam.correspondingMethodParams.length, 1);
      ok(parentClient.initialization);
      strictEqual(
        queryParam.correspondingMethodParams[0],
        parentClient.initialization.properties.find((x) => x.isApiVersionParam)
      );

      const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);
      strictEqual(methodAcceptParam.onClient, false);
      strictEqual(methodAcceptParam.optional, false);

      const headerParams = method.operation.parameters.filter(
        (x): x is SdkHeaderParameter => x.kind === "header"
      );
      strictEqual(headerParams.length, 6);

      const operationAcceptParam = headerParams.find((x) => x.serializedName === "Accept");
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);
      strictEqual(operationAcceptParam.onClient, false);
      strictEqual(operationAcceptParam.optional, false);
      strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

      strictEqual(
        method.parameters.some((x) => x.name === "contentType"),
        false
      );
      strictEqual(
        headerParams.some((x) => x.serializedName === "Content-Type"),
        false
      );
    });
    it("poll widget", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await compileAzureWidgetService(
        runnerWithCore,
        `
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;

      @doc("Creates or updates a Widget asynchronously")
      @pollingOperation(Widgets.getWidgetOperationStatus)
      createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
      `
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const parentClient = sdkPackage.clients[0];
      const client = parentClient.methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      ok(client);
      strictEqual(client.methods.length, 2);

      // TEST GET STATUS
      const getStatus = client.methods.find((x) => x.name === "getWidgetOperationStatus");
      ok(getStatus);
      strictEqual(getStatus.name, "getWidgetOperationStatus");
      strictEqual(getStatus.kind, "basic");
      strictEqual(
        getStatus.crossLanguageDefintionId,
        "Contoso.WidgetManager.Widgets.getWidgetOperationStatus"
      );
      strictEqual(getStatus.parameters.length, 4);

      const methodWidgetName = getStatus.parameters.find((p) => p.name === "widgetName");
      ok(methodWidgetName);
      strictEqual(methodWidgetName.kind, "method");
      strictEqual(methodWidgetName.isApiVersionParam, false);
      deepStrictEqual(methodWidgetName.apiVersions, ["2022-08-30"]);
      strictEqual(methodWidgetName.onClient, false);
      strictEqual(methodWidgetName.optional, false);

      const methodOperationId = getStatus.parameters.find((p) => p.name === "operationId");
      ok(methodOperationId);
      strictEqual(methodOperationId.kind, "method");
      strictEqual(methodOperationId.isApiVersionParam, false);
      deepStrictEqual(methodOperationId.apiVersions, ["2022-08-30"]);
      strictEqual(methodOperationId.onClient, false);
      strictEqual(methodOperationId.optional, false);

      const methodAcceptParam = getStatus.parameters.find((x) => x.name === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);
      strictEqual(methodAcceptParam.onClient, false);
      strictEqual(methodAcceptParam.optional, false);

      strictEqual(getStatus.operation.parameters.length, 4);

      const pathParams = getStatus.operation.parameters.filter((x) => x.kind === "path");
      strictEqual(pathParams.length, 2);

      const pathParam1 = pathParams[0];
      strictEqual(pathParam1.kind, "path");
      strictEqual(pathParam1.name, "widgetName");
      strictEqual(pathParam1.serializedName, "widgetName");
      strictEqual(pathParam1.onClient, false);
      strictEqual(pathParam1.correspondingMethodParams.length, 1);
      strictEqual(pathParam1.correspondingMethodParams[0], methodWidgetName);

      const pathParam2 = pathParams[1];
      strictEqual(pathParam2.kind, "path");
      strictEqual(pathParam2.name, "operationId");
      strictEqual(pathParam2.serializedName, "operationId");
      strictEqual(pathParam2.onClient, false);
      strictEqual(pathParam2.correspondingMethodParams.length, 1);
      strictEqual(pathParam2.correspondingMethodParams[0], methodOperationId);

      const apiVersionParam = getStatus.operation.parameters.find((x) => x.kind === "query");
      ok(apiVersionParam);
      strictEqual(apiVersionParam.isApiVersionParam, true);
      strictEqual(apiVersionParam.name, "apiVersion");
      strictEqual(apiVersionParam.serializedName, "api-version");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
      ok(parentClient.initialization);
      strictEqual(
        apiVersionParam.correspondingMethodParams[0],
        parentClient.initialization.properties.find((x) => x.isApiVersionParam)
      );

      const operationAcceptParam = getStatus.operation.parameters.find((x) => x.kind === "header");
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.name, "accept");
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);
      strictEqual(operationAcceptParam.onClient, false);
      strictEqual(operationAcceptParam.optional, false);
      strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

      const widgetModel = sdkPackage.models.find((x) => x.name === "Widget");

      // TEST POLLING
      const createOrUpdate = client.methods.find((x) => x.name === "createOrUpdateWidget");
      ok(createOrUpdate);
      strictEqual(createOrUpdate.kind, "lro");
      strictEqual(createOrUpdate.parameters.length, 12);
      strictEqual(
        createOrUpdate.crossLanguageDefintionId,
        "Contoso.WidgetManager.Widgets.createOrUpdateWidget"
      );
      deepStrictEqual(
        createOrUpdate.parameters.map((x) => x.name),
        [
          "apiVersion",
          "widgetName",
          "contentType",
          "resource",
          "repeatabilityRequestId",
          "repeatabilityFirstSent",
          "ifMatch",
          "ifNoneMatch",
          "ifUnmodifiedSince",
          "ifModifiedSince",
          "clientRequestId",
          "accept",
        ]
      );

      const serviceOperation = createOrUpdate.operation;
      strictEqual(serviceOperation.verb, "patch");
      const headerParams = serviceOperation.parameters.filter(
        (x): x is SdkHeaderParameter => x.kind === "header"
      );
      deepStrictEqual(
        headerParams.map((x) => x.name),
        [
          "contentType",
          "repeatabilityRequestId",
          "repeatabilityFirstSent",
          "ifMatch",
          "ifNoneMatch",
          "ifUnmodifiedSince",
          "ifModifiedSince",
          "clientRequestId",
          "accept",
        ]
      );
      strictEqual(headerParams.length, 9);
      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.serializedName, "widgetName");
      const queryParam = serviceOperation.parameters.find((x) => x.kind === "query");
      ok(queryParam);
      strictEqual(queryParam.serializedName, "api-version");
      ok(serviceOperation.bodyParam);
      strictEqual(serviceOperation.bodyParam.name, "resource");
      strictEqual(serviceOperation.bodyParam.type, widgetModel);

      strictEqual(serviceOperation.responses.size, 2);
      const responseHeaders = [
        "Repeatability-Result",
        "ETag",
        "x-ms-client-request-id",
        "Operation-Location",
      ];
      const response200 = serviceOperation.responses.get(200);
      ok(response200);
      deepStrictEqual(
        response200.headers.map((x) => x.serializedName),
        responseHeaders
      );
      strictEqual(response200.type, widgetModel);

      const response201 = serviceOperation.responses.get(201);
      ok(response201);
      deepStrictEqual(
        response201.headers.map((x) => x.serializedName),
        responseHeaders
      );
      strictEqual(response201.type, widgetModel);

      const exception = serviceOperation.exceptions.get("*");
      ok(exception);
      strictEqual(exception.kind, "http");
      ok(exception.type);
      strictEqual(exception.type.kind, "model");
      strictEqual(exception.type.crossLanguageDefinitionId, "Azure.Core.Foundations.ErrorResponse");
      // we shouldn't generate this model
      strictEqual(
        sdkPackage.models.find(
          (x) => x.crossLanguageDefinitionId === "Azure.Core.Foundations.ErrorResponse"
        ),
        undefined
      );

      const methodResponse = createOrUpdate.response;
      strictEqual(methodResponse.kind, "method");
      strictEqual(methodResponse.type, widgetModel);
      strictEqual(createOrUpdate.response.resultPath, "result");
    });
    it("lro delete", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await compileAzureWidgetService(
        runnerWithCore,
        `
        op delete is ResourceOperations.LongRunningResourceDelete<Widget>;
        `
      );
      const method = getServiceMethodOfClient(runnerWithCore.context.sdkPackage);
      strictEqual(method.name, "delete");
      strictEqual(method.kind, "lro");
      strictEqual(method.response.type, undefined);
      strictEqual(runnerWithCore.context.sdkPackage.models.length, 0);
      strictEqual(runnerWithCore.context.sdkPackage.enums.length, 1);
    });
    it("paging", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await compileAzureWidgetService(
        runnerWithCore,
        `
        @doc("List Manufacturer resources")
        listManufacturers is Operations.ResourceList<Manufacturer>;
      `
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.models[0].name, "Manufacturer");
      const widgetClient = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      ok(widgetClient);
      strictEqual(widgetClient.initialization.properties.length, 3);
      strictEqual(widgetClient.initialization.access, "internal");
      strictEqual(widgetClient.methods.length, 1);
      const listManufacturers = widgetClient.methods[0];

      strictEqual(listManufacturers.name, "listManufacturers");
      strictEqual(
        listManufacturers.crossLanguageDefintionId,
        "Contoso.WidgetManager.Widgets.listManufacturers"
      );
      strictEqual(listManufacturers.kind, "paging");
      strictEqual(listManufacturers.parameters.length, 3);
      deepStrictEqual(
        listManufacturers.parameters.map((x) => x.name),
        ["apiVersion", "clientRequestId", "accept"]
      );
      const methodResponse = listManufacturers.response.type;
      ok(methodResponse);
      strictEqual(methodResponse.kind, "array");
      deepStrictEqual(methodResponse.valueType, sdkPackage.models[0]);

      const operation = listManufacturers.operation;
      strictEqual(operation.kind, "http");
      strictEqual(operation.verb, "get");
      strictEqual(operation.parameters.length, 3);

      const apiVersion = operation.parameters.find((x) => x.isApiVersionParam);
      ok(apiVersion);
      strictEqual(apiVersion.kind, "query");
      strictEqual(apiVersion.name, "apiVersion");
      strictEqual(apiVersion.serializedName, "api-version");
      strictEqual(apiVersion.onClient, true);

      const clientRequestId = operation.parameters.find((x) => x.name === "clientRequestId");
      ok(clientRequestId);
      strictEqual(clientRequestId.kind, "header");
      deepStrictEqual(
        clientRequestId.correspondingMethodParams[0],
        listManufacturers.parameters[1]
      );

      const accept = operation.parameters.find((x) => x.name === "accept");
      ok(accept);
      strictEqual(accept.kind, "header");
      deepStrictEqual(accept.correspondingMethodParams[0], listManufacturers.parameters[2]);

      strictEqual(operation.responses.size, 1);
      const response200 = operation.responses.get(200);
      ok(response200);
      strictEqual(response200.kind, "http");
      const pagingModel = response200.type;
      ok(pagingModel);
      strictEqual(pagingModel.kind, "model");
      strictEqual(pagingModel.name, "PagedManufacturer");
      strictEqual(pagingModel.properties.length, 3);

      const valueProperty = pagingModel.properties.find((x) => x.name === "value");
      ok(valueProperty);
      strictEqual(valueProperty.kind, "property");
      strictEqual(valueProperty.type.kind, "array");
      strictEqual(valueProperty.type.valueType, sdkPackage.models[0]);

      const nextLinkProperty = pagingModel.properties.find((x) => x.name === "nextLink");
      ok(nextLinkProperty);
      strictEqual(nextLinkProperty.kind, "property");
      strictEqual(nextLinkProperty.type.kind, "url");
      strictEqual(nextLinkProperty.serializedName, "nextLink");
      strictEqual(nextLinkProperty.serializedName, listManufacturers.nextLinkPath);

      const clientRequestIdProperty = pagingModel.properties.find(
        (x) => x.name === "clientRequestId"
      );
      ok(clientRequestIdProperty);
      strictEqual(clientRequestIdProperty.kind, "header");
    });
  });
  describe("spread", () => {
    it("plain model with no decorators", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(...Input): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters.find((x) => x.name === "key");
      ok(methodParam);
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeParam);
      strictEqual(contentTypeParam.clientDefaultValue, undefined);
      strictEqual(contentTypeParam.type.kind, "constant");
      strictEqual(contentTypeParam.onClient, false);

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      const correspondingMethodParams = bodyParameter.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(correspondingMethodParams[0].name, "key");
    });

    it("alias with no decorators", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        alias BodyParameter = {
          name: string;
        };

        op myOp(...BodyParameter): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters.find((x) => x.name === "name");
      ok(methodParam);
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const contentTypeMethodParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeMethodParam);
      strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
      strictEqual(contentTypeMethodParam.type.kind, "constant");

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(bodyParameter.type.properties.length, 1);
      strictEqual(bodyParameter.type.properties[0].name, "name");

      const correspondingMethodParams = bodyParameter.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(bodyParameter.type.properties[0].name, correspondingMethodParams[0].name);
    });

    it("rest template spreading of multiple models", async () => {
      await runner.compile(`
      @service({
        title: "Pet Store Service",
      })
      namespace PetStore;
      using TypeSpec.Rest.Resource;

      @error
      model PetStoreError {
        code: int32;
        message: string;
      }

      @resource("pets")
      model Pet {
        @key("petId")
        id: int32;
      }

      @resource("checkups")
      model Checkup {
        @key("checkupId")
        id: int32;

        vetName: string;
        notes: string;
      }

      interface PetCheckups
        extends ExtensionResourceCreateOrUpdate<Checkup, Pet, PetStoreError>,
          ExtensionResourceList<Checkup, Pet, PetStoreError> {}
      `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 4);
      deepStrictEqual(
        sdkPackage.models.map((x) => x.name).sort(),
        ["CheckupCollectionWithNextLink", "Checkup", "PetStoreError", "CheckupUpdate"].sort()
      );
      const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      const createOrUpdate = client.methods[0];
      strictEqual(createOrUpdate.kind, "basic");
      strictEqual(createOrUpdate.name, "createOrUpdate");
      strictEqual(createOrUpdate.parameters.length, 5);
      strictEqual(createOrUpdate.parameters[0].name, "petId");
      strictEqual(createOrUpdate.parameters[1].name, "checkupId");
      strictEqual(createOrUpdate.parameters[2].name, "resource");
      strictEqual(createOrUpdate.parameters[2].type.kind, "model");
      strictEqual(createOrUpdate.parameters[2].type.name, "CheckupUpdate");
      strictEqual(createOrUpdate.parameters[3].name, "contentType");
      strictEqual(createOrUpdate.parameters[4].name, "accept");

      const opParams = createOrUpdate.operation.parameters;
      strictEqual(opParams.length, 4);
      ok(opParams.find((x) => x.kind === "path" && x.serializedName === "petId"));
      ok(opParams.find((x) => x.kind === "path" && x.serializedName === "checkupId"));
      ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Content-Type"));
      ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Accept"));
      strictEqual(createOrUpdate.operation.responses.size, 2);
      const response200 = createOrUpdate.operation.responses.get(200);
      ok(response200);
      ok(response200.type);
      strictEqual(response200.type.kind, "model");
      strictEqual(response200.type.name, "Checkup");
      const response201 = createOrUpdate.operation.responses.get(201);
      ok(response201);
      ok(response201.type);
      deepStrictEqual(response200.type, response201?.type);
    });

    it("multi layer template with discriminated model spread", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @versioned(MyVersions)
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({name: "Service"})
        namespace My.Service;
        
        alias ServiceTraits = NoRepeatableRequests &
          NoConditionalRequests &
          NoClientRequestId;

        alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

        @doc("The version of the API.")
        enum MyVersions {
          @doc("The version 2022-12-01-preview.")
          @useDependency(Versions.v1_0_Preview_2)
          v2022_12_01_preview: "2022-12-01-preview",
        }

        @discriminator("kind")
        @resource("dataConnections")
        model DataConnection {
          id?: string;

          @key("dataConnectionName")
          @visibility("read")
          name: string;

          @visibility("read")
          createdDate?: utcDateTime;

          frequencyOffset?: int32;
        }

        @discriminator("kind")
        model DataConnectionData {
          name?: string;
          frequencyOffset?: int32;
        }

        interface DataConnections {

          getDataConnection is Operations.ResourceRead<DataConnection>;

          @createsOrReplacesResource(DataConnection)
          @put
          createOrReplaceDataConnection is Foundations.ResourceOperation<
            DataConnection,
            DataConnectionData,
            DataConnection
          >;

          deleteDataConnection is Operations.ResourceDelete<DataConnection>;
        }
      `);
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 2);

      const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;

      const createOrReplace = client.methods[1];
      strictEqual(createOrReplace.kind, "basic");
      strictEqual(createOrReplace.name, "createOrReplaceDataConnection");
      strictEqual(createOrReplace.parameters.length, 6);
      ok(
        createOrReplace.parameters.find(
          (x) => x.name === "dataConnectionName" && x.type.kind === "string"
        )
      );
      ok(createOrReplace.parameters.find((x) => x.name === "name" && x.type.kind === "string"));
      ok(
        createOrReplace.parameters.find(
          (x) => x.name === "frequencyOffset" && x.type.kind === "int32"
        )
      );
      ok(createOrReplace.parameters.find((x) => x.name === "contentType"));
      ok(createOrReplace.parameters.find((x) => x.name === "accept"));
      ok(createOrReplace.parameters.find((x) => x.isApiVersionParam && x.onClient));

      const opParams = createOrReplace.operation.parameters;
      strictEqual(opParams.length, 4);
      ok(opParams.find((x) => x.isApiVersionParam === true && x.kind === "query"));
      ok(opParams.find((x) => x.kind === "path" && x.serializedName === "dataConnectionName"));
      ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Content-Type"));
      ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Accept"));
      strictEqual(createOrReplace.operation.bodyParam?.type.kind, "model");
      strictEqual(
        createOrReplace.operation.bodyParam?.type.name,
        "CreateOrReplaceDataConnectionRequest"
      );
      deepStrictEqual(
        createOrReplace.operation.bodyParam.correspondingMethodParams[0],
        createOrReplace.parameters[2]
      );
      deepStrictEqual(
        createOrReplace.operation.bodyParam.correspondingMethodParams[1],
        createOrReplace.parameters[3]
      );
      strictEqual(createOrReplace.operation.responses.size, 1);
      const response200 = createOrReplace.operation.responses.get(200);
      ok(response200);
      ok(response200.type);
      strictEqual(response200.type.kind, "model");
      strictEqual(response200.type.name, "DataConnection");
    });

    it("model with @body decorator", async () => {
      await runner.compileWithBuiltInService(`
        model Shelf {
          name: string;
          theme?: string;
        }
        model CreateShelfRequest {
          @body
          body: Shelf;
        }
        op createShelf(...CreateShelfRequest): Shelf;
        `);
      const method = getServiceMethodOfClient(runner.context.sdkPackage);
      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 1);
      const shelfModel = models.find((x) => x.name === "Shelf");
      ok(shelfModel);
      strictEqual(method.parameters.length, 3);
      const shelfParameter = method.parameters[0];
      strictEqual(shelfParameter.kind, "method");
      strictEqual(shelfParameter.name, "body");
      strictEqual(shelfParameter.optional, false);
      strictEqual(shelfParameter.isGeneratedName, false);
      deepStrictEqual(shelfParameter.type, shelfModel);
      const contentTypeMethoParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeMethoParam);
      const acceptMethodParam = method.parameters.find((x) => x.name === "accept");
      ok(acceptMethodParam);

      const op = method.operation;
      strictEqual(op.parameters.length, 2);
      ok(
        op.parameters.find(
          (x) =>
            x.kind === "header" &&
            x.serializedName === "Content-Type" &&
            x.correspondingMethodParams[0] === contentTypeMethoParam
        )
      );
      ok(
        op.parameters.find(
          (x) =>
            x.kind === "header" &&
            x.serializedName === "Accept" &&
            x.correspondingMethodParams[0] === acceptMethodParam
        )
      );

      const bodyParam = op.bodyParam;
      ok(bodyParam);
      strictEqual(bodyParam.kind, "body");
      strictEqual(bodyParam.name, "body");
      strictEqual(bodyParam.optional, false);
      strictEqual(bodyParam.isGeneratedName, false);
      deepStrictEqual(bodyParam.type, shelfModel);
      deepStrictEqual(bodyParam.correspondingMethodParams[0], shelfParameter);
    });
    it("formdata model without body decorator in spread model", async () => {
      await runner.compileWithBuiltInService(`

      model DocumentTranslateContent {
        @header contentType: "multipart/form-data";
        document: bytes;
      }
      alias Intersected = DocumentTranslateContent & {};
      op test(...Intersected): void;
      `);
      const method = getServiceMethodOfClient(runner.context.sdkPackage);
      const documentMethodParam = method.parameters.find((x) => x.name === "document");
      ok(documentMethodParam);
      strictEqual(documentMethodParam.kind, "method");
      const op = method.operation;
      ok(op.bodyParam);
      strictEqual(op.bodyParam.kind, "body");
      strictEqual(op.bodyParam.name, "testRequest");
      deepStrictEqual(op.bodyParam.correspondingMethodParams, [documentMethodParam]);
    });

    it("anonymous model with @body should not be spread", async () => {
      await runner.compileWithBuiltInService(`
        op test(@body body: {prop: string}): void;
        `);
      const method = getServiceMethodOfClient(runner.context.sdkPackage);
      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models.find((x) => x.name === "TestRequest");
      ok(model);
      strictEqual(model.usage, UsageFlags.Input | UsageFlags.Json);

      strictEqual(method.parameters.length, 2);
      const param = method.parameters[0];
      strictEqual(param.kind, "method");
      strictEqual(param.name, "body");
      strictEqual(param.optional, false);
      strictEqual(param.isGeneratedName, false);
      deepStrictEqual(param.type, model);
      const contentTypeMethoParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeMethoParam);

      const op = method.operation;
      strictEqual(op.parameters.length, 1);
      ok(
        op.parameters.find(
          (x) =>
            x.kind === "header" &&
            x.serializedName === "Content-Type" &&
            x.correspondingMethodParams[0] === contentTypeMethoParam
        )
      );

      const bodyParam = op.bodyParam;
      ok(bodyParam);
      strictEqual(bodyParam.kind, "body");
      strictEqual(bodyParam.name, "body");
      strictEqual(bodyParam.optional, false);
      strictEqual(bodyParam.isGeneratedName, false);
      deepStrictEqual(bodyParam.type, model);
      deepStrictEqual(bodyParam.correspondingMethodParams[0].type, model);
    });

    it("anonymous model from spread with @bodyRoot should not be spread", async () => {
      await runner.compileWithBuiltInService(`
        model Test {
          prop: string;
        }
        op test(@bodyRoot body: {...Test}): void;
        `);
      const method = getServiceMethodOfClient(runner.context.sdkPackage);
      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models.find((x) => x.name === "TestRequest");
      ok(model);
      strictEqual(model.usage, UsageFlags.Input | UsageFlags.Json);

      strictEqual(method.parameters.length, 2);
      const param = method.parameters[0];
      strictEqual(param.kind, "method");
      strictEqual(param.name, "body");
      strictEqual(param.optional, false);
      strictEqual(param.isGeneratedName, false);
      deepStrictEqual(param.type, model);
      const contentTypeMethoParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeMethoParam);

      const op = method.operation;
      strictEqual(op.parameters.length, 1);
      ok(
        op.parameters.find(
          (x) =>
            x.kind === "header" &&
            x.serializedName === "Content-Type" &&
            x.correspondingMethodParams[0] === contentTypeMethoParam
        )
      );

      const bodyParam = op.bodyParam;
      ok(bodyParam);
      strictEqual(bodyParam.kind, "body");
      strictEqual(bodyParam.name, "body");
      strictEqual(bodyParam.optional, false);
      strictEqual(bodyParam.isGeneratedName, false);
      deepStrictEqual(bodyParam.type, model);
      deepStrictEqual(bodyParam.correspondingMethodParams[0].type, model);
    });

    it("implicit spread", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        op myOp(a: string, b: string): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 3);

      const a = method.parameters.find((x) => x.name === "a");
      ok(a);
      strictEqual(a.kind, "method");
      strictEqual(a.optional, false);
      strictEqual(a.onClient, false);
      strictEqual(a.isApiVersionParam, false);
      strictEqual(a.type.kind, "string");

      const b = method.parameters.find((x) => x.name === "b");
      ok(b);
      strictEqual(b.kind, "method");
      strictEqual(b.optional, false);
      strictEqual(b.onClient, false);
      strictEqual(b.isApiVersionParam, false);
      strictEqual(b.type.kind, "string");

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      strictEqual(bodyParameter.correspondingMethodParams.length, 2);
      deepStrictEqual(bodyParameter.correspondingMethodParams[0], a);
      deepStrictEqual(bodyParameter.correspondingMethodParams[1], b);
    });

    it("implicit spread with metadata", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        op myOp(@header a: string, b: string): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 3);

      const a = method.parameters.find((x) => x.name === "a");
      ok(a);
      strictEqual(a.kind, "method");
      strictEqual(a.optional, false);
      strictEqual(a.onClient, false);
      strictEqual(a.isApiVersionParam, false);
      strictEqual(a.type.kind, "string");

      const b = method.parameters.find((x) => x.name === "b");
      ok(b);
      strictEqual(b.kind, "method");
      strictEqual(b.optional, false);
      strictEqual(b.onClient, false);
      strictEqual(b.isApiVersionParam, false);
      strictEqual(b.type.kind, "string");

      const serviceOperation = method.operation;
      const headerParameter = serviceOperation.parameters.find((p) => (p.name = "a"));
      ok(headerParameter);
      strictEqual(headerParameter.kind, "header");
      strictEqual(headerParameter.onClient, false);
      strictEqual(headerParameter.optional, false);
      strictEqual(headerParameter.type.kind, "string");

      strictEqual(headerParameter.correspondingMethodParams.length, 1);
      deepStrictEqual(headerParameter.correspondingMethodParams[0], a);

      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      strictEqual(bodyParameter.correspondingMethodParams.length, 1);
      deepStrictEqual(bodyParameter.correspondingMethodParams[0], b);
    });

    it("explicit spread", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test {
          a: string;
          b: string;
        }
        op myOp(...Test): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 3);

      const a = method.parameters.find((x) => x.name === "a");
      ok(a);
      strictEqual(a.kind, "method");
      strictEqual(a.optional, false);
      strictEqual(a.onClient, false);
      strictEqual(a.isApiVersionParam, false);
      strictEqual(a.type.kind, "string");

      const b = method.parameters.find((x) => x.name === "b");
      ok(b);
      strictEqual(b.kind, "method");
      strictEqual(b.optional, false);
      strictEqual(b.onClient, false);
      strictEqual(b.isApiVersionParam, false);
      strictEqual(b.type.kind, "string");

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      strictEqual(bodyParameter.correspondingMethodParams.length, 2);
      deepStrictEqual(bodyParameter.correspondingMethodParams[0], a);
      deepStrictEqual(bodyParameter.correspondingMethodParams[1], b);
    });

    it("explicit spread with metadata", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test {
          @header
          a: string;
          b: string;
        }
        op myOp(...Test): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 3);

      const a = method.parameters.find((x) => x.name === "a");
      ok(a);
      strictEqual(a.kind, "method");
      strictEqual(a.optional, false);
      strictEqual(a.onClient, false);
      strictEqual(a.isApiVersionParam, false);
      strictEqual(a.type.kind, "string");

      const b = method.parameters.find((x) => x.name === "b");
      ok(b);
      strictEqual(b.kind, "method");
      strictEqual(b.optional, false);
      strictEqual(b.onClient, false);
      strictEqual(b.isApiVersionParam, false);
      strictEqual(b.type.kind, "string");

      const serviceOperation = method.operation;
      const headerParameter = serviceOperation.parameters.find((p) => (p.name = "a"));
      ok(headerParameter);
      strictEqual(headerParameter.kind, "header");
      strictEqual(headerParameter.onClient, false);
      strictEqual(headerParameter.optional, false);
      strictEqual(headerParameter.type.kind, "string");

      strictEqual(headerParameter.correspondingMethodParams.length, 1);
      deepStrictEqual(headerParameter.correspondingMethodParams[0], a);

      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      strictEqual(bodyParameter.correspondingMethodParams.length, 1);
      deepStrictEqual(bodyParameter.correspondingMethodParams[0], b);
    });

    it("explicit multiple spread", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test1 {
          a: string;
          
        }

        model Test2 {
          b: string;
        }
        op myOp(...Test1, ...Test2): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 3);

      const a = method.parameters.find((x) => x.name === "a");
      ok(a);
      strictEqual(a.kind, "method");
      strictEqual(a.optional, false);
      strictEqual(a.onClient, false);
      strictEqual(a.isApiVersionParam, false);
      strictEqual(a.type.kind, "string");

      const b = method.parameters.find((x) => x.name === "b");
      ok(b);
      strictEqual(b.kind, "method");
      strictEqual(b.optional, false);
      strictEqual(b.onClient, false);
      strictEqual(b.isApiVersionParam, false);
      strictEqual(b.type.kind, "string");

      const serviceOperation = method.operation;
      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      strictEqual(bodyParameter.correspondingMethodParams.length, 2);
      deepStrictEqual(bodyParameter.correspondingMethodParams[0], a);
      deepStrictEqual(bodyParameter.correspondingMethodParams[1], b);
    });

    it("explicit multiple spread with metadata", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test1 {
          @header
          a: string;
        }
        model Test2 {
          b: string;
        }
        op myOp(...Test1, ...Test2): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 3);

      const a = method.parameters.find((x) => x.name === "a");
      ok(a);
      strictEqual(a.kind, "method");
      strictEqual(a.optional, false);
      strictEqual(a.onClient, false);
      strictEqual(a.isApiVersionParam, false);
      strictEqual(a.type.kind, "string");

      const b = method.parameters.find((x) => x.name === "b");
      ok(b);
      strictEqual(b.kind, "method");
      strictEqual(b.optional, false);
      strictEqual(b.onClient, false);
      strictEqual(b.isApiVersionParam, false);
      strictEqual(b.type.kind, "string");

      const serviceOperation = method.operation;
      const headerParameter = serviceOperation.parameters.find((p) => (p.name = "a"));
      ok(headerParameter);
      strictEqual(headerParameter.kind, "header");
      strictEqual(headerParameter.onClient, false);
      strictEqual(headerParameter.optional, false);
      strictEqual(headerParameter.type.kind, "string");

      strictEqual(headerParameter.correspondingMethodParams.length, 1);
      deepStrictEqual(headerParameter.correspondingMethodParams[0], a);

      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);
      strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
      strictEqual(bodyParameter.type.access, "internal");

      strictEqual(bodyParameter.correspondingMethodParams.length, 1);
      deepStrictEqual(bodyParameter.correspondingMethodParams[0], b);
    });

    it("spread idempotent", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
          alias FooAlias = {
              @path id: string;
              @doc("name of the Foo")
              name: string;
          };
          op test(...FooAlias): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 1);
      getAllModels(runner.context);

      strictEqual(sdkPackage.models[0].name, "TestRequest");
      strictEqual(sdkPackage.models[0].usage, UsageFlags.Spread | UsageFlags.Json);
    });
  });
  describe("versioning", () => {
    it("define own api version param", async () => {
      await runner.compileWithBuiltInService(`
      model ApiVersionParam {
        @header apiVersion: Versions;
      }

      enum Versions {
        v1, v2
      }

      op getPet(...ApiVersionParam): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.parameters.length, 1);
      const apiVersionParam = method.operation.parameters[0];
      strictEqual(apiVersionParam.kind, "header");
      strictEqual(apiVersionParam.serializedName, "api-version");
      strictEqual(apiVersionParam.name, "apiVersion");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.isApiVersionParam, true);
    });

    it("default api version for interface extends", async () => {
      await runner.compile(`
        namespace Azure.ResourceManager {
          interface Operations {
            @get
            list(@query "api-version": string): void;
          }
        }
        
        @service({})
        @versioned(Versions)
        namespace Test {
          enum Versions {
            v1,
            v2,
          }
        
          interface Operations extends Azure.ResourceManager.Operations {}
        }      
      `);

      const sdkPackage = runner.context.sdkPackage;
      const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      strictEqual(client.methods[0].parameters[0].clientDefaultValue, "v2");
    });

    it("default api version for operation is", async () => {
      await runner.compile(`
        namespace Azure.ResourceManager {
          interface Operations {
            @get
            list(@query "api-version": string): void;
          }
        }
        
        @service({})
        @versioned(Versions)
        namespace Test {
          enum Versions {
            v1,
            v2,
          }
        
          op list is Azure.ResourceManager.Operations.list;
        }      
      `);

      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients[0].methods[0].parameters[0].clientDefaultValue, "v2");
    });
    it("add method", async () => {
      await runner.compileWithVersionedService(`
      @route("/v1")
      @post
      @added(Versions.v2)
      op v2(@header headerV2: string): void;
      `);

      const sdkPackage = runner.context.sdkPackage;
      deepStrictEqual(sdkPackage.clients[0].apiVersions, ["v1", "v2"]);
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.kind, "basic");
      deepStrictEqual(method.apiVersions, ["v2"]);
      strictEqual(method.parameters.length, 1);
      const methodParam = sdkPackage.clients[0].methods[0].parameters[0];
      strictEqual(methodParam.name, "headerV2");
      strictEqual(methodParam.kind, "method");
      deepStrictEqual(methodParam.apiVersions, ["v2"]);

      strictEqual(method.operation.parameters.length, 1);
      const headerParam = method.operation.parameters[0];
      strictEqual(headerParam.name, "headerV2");
      strictEqual(headerParam.kind, "header");
      deepStrictEqual(headerParam.apiVersions, ["v2"]);
    });
    it("add parameter", async () => {
      await runner.compileWithVersionedService(`
      @route("/v1")
      @post
      op v1(@added(Versions.v2) @header headerV2: string): void;
      `);

      const sdkPackage = runner.context.sdkPackage;
      deepStrictEqual(sdkPackage.clients[0].apiVersions, ["v1", "v2"]);
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.kind, "basic");
      deepStrictEqual(method.apiVersions, ["v1", "v2"]);
      strictEqual(method.parameters.length, 1);
      const methodParam = sdkPackage.clients[0].methods[0].parameters[0];
      strictEqual(methodParam.name, "headerV2");
      strictEqual(methodParam.kind, "method");
      deepStrictEqual(methodParam.apiVersions, ["v2"]);

      strictEqual(method.operation.parameters.length, 1);
      const headerParam = method.operation.parameters[0];
      strictEqual(headerParam.name, "headerV2");
      strictEqual(headerParam.kind, "header");
      deepStrictEqual(headerParam.apiVersions, ["v2"]);
    });
  });

  describe("lro", () => {
    it("customized lro delete", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @versioned(MyVersions)
        @server("http://localhost:3000", "endpoint")
        @service({name: "Service"})
        namespace My.Service;

        enum MyVersions {
          @useDependency(Versions.v1_0_Preview_2)
          v1: "v1",
        }

        op delete(): {
          ...AcceptedResponse,
          @header("Location")
          @Azure.Core.pollingLocation(Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>)
          @Azure.Core.finalLocation(void)
          location?: string;
        };

        @Azure.Core.lroStatus
        union ResourceProvisioningState {
          Succeeded: "Succeeded",
          Failed: "Failed",
          Canceled: "Canceled",
          string,
        }

        model ArmOperationStatus {
          @Azure.Core.lroStatus
          status: ResourceProvisioningState;
          @key
          @path
          @segment("operationStatuses")
          id: Azure.Core.uuid;
          @visibility("read")
          name?: string;
        }
      `);
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(sdkPackage.enums.length, 1);
    });
  });
});

function getServiceMethodOfClient(
  sdkPackage: SdkPackage<SdkHttpOperation>,
  numMethods: number = 1,
  methodIndex: number = 0
): SdkServiceMethod<SdkHttpOperation> {
  let client = sdkPackage.clients[0];
  if (client.methods.some((x) => x.kind === "clientaccessor")) {
    client = client.methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
  }
  strictEqual(client.methods.length, numMethods);
  const method = client.methods[methodIndex];
  strictEqual(["basic", "paging", "lro", "lropaging"].includes(method.kind), true);
  return method as SdkServiceMethod<SdkHttpOperation>;
}
