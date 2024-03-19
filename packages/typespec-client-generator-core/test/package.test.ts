import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ApiKeyAuth, OAuth2Flow, Oauth2Auth } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkBodyParameter,
  SdkCredentialParameter,
  SdkCredentialType,
  SdkEndpointParameter,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkPackage,
  SdkQueryParameter,
  SdkServiceMethod,
} from "../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: package", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

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

      strictEqual(runnerWithPackageName.context.experimental_sdkPackage.name, "My.Package.Name");
    });
    it("from namespace", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Package.Name;
      `);

      strictEqual(runner.context.experimental_sdkPackage.name, "My.Package.Name");
    });
  });
  describe("root namespace", () => {
    it("basic namespace", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Namespace;
      `);

      strictEqual(runner.context.experimental_sdkPackage.rootNamespace, "My.Namespace");
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

      strictEqual(runner.context.experimental_sdkPackage.rootNamespace, "My.Namespace");
    });
  });
  describe("SdkClientType", () => {
    it("name", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace NotMyClient;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.name, "ServiceClientOptions");
      strictEqual(initialization.properties.length, 1);
      const endpointParam = initialization.properties[0];
      strictEqual(endpointParam.kind, "endpoint");
      strictEqual(endpointParam.nameInClient, "endpoint");
      strictEqual(endpointParam.onClient, true);
      strictEqual(endpointParam.optional, false);
      strictEqual(endpointParam.type.kind, "constant");
      strictEqual(endpointParam.type.value, "http://localhost:3000");
      strictEqual(endpointParam.urlEncode, false);
    });

    it("initialization default endpoint with apikey auth", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({})
        namespace My.Service;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.endpoint, "http://localhost:3000");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 2);

      const endpointParam = initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.type.kind, "constant");
      strictEqual(endpointParam.type.value, "http://localhost:3000");

      const credentialParam = initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
      )[0];
      strictEqual(credentialParam.nameInClient, "credential");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 2);

      const endpointParam = initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.type.kind, "constant");
      strictEqual(endpointParam.type.value, "http://localhost:3000");

      const credentialParam = initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
      )[0];
      strictEqual(credentialParam.nameInClient, "credential");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 2);

      const endpointParam = initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.type.kind, "constant");
      strictEqual(endpointParam.type.value, "http://localhost:3000");

      const credentialParam = initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
      )[0];
      strictEqual(credentialParam.nameInClient, "credential");
      strictEqual(credentialParam.onClient, true);
      strictEqual(credentialParam.optional, false);
      strictEqual(credentialParam.type.kind, "union");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.endpoint, "{endpointInput}");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 2);

      const endpointParam = initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      )[0];
      strictEqual(endpointParam.clientDefaultValue, undefined);
      strictEqual(endpointParam.urlEncode, false);
      strictEqual(endpointParam.nameInClient, "endpointInput");
      strictEqual(endpointParam.onClient, true);
      strictEqual(endpointParam.optional, false);
      strictEqual(endpointParam.kind, "endpoint");
      strictEqual(endpointParam.description, "Testserver endpoint");

      const credentialParam = initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
      )[0];
      strictEqual(credentialParam.nameInClient, "credential");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.endpoint, "{endpoint}/server/path/multiple/{apiVersion}");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 3);
      strictEqual(client.apiVersions.length, 1);
      strictEqual(client.apiVersions[0], "v1.0");

      const endpointParams = initialization.properties.filter(
        (p): p is SdkEndpointParameter => p.kind === "endpoint"
      );
      strictEqual(endpointParams.length, 2);
      const endpointParam = endpointParams[0];
      strictEqual(endpointParam.clientDefaultValue, undefined);
      strictEqual(endpointParam.urlEncode, false);
      strictEqual(endpointParam.nameInClient, "endpoint");
      strictEqual(endpointParam.onClient, true);
      strictEqual(endpointParam.optional, false);
      strictEqual(endpointParam.kind, "endpoint");

      const apiVersionParam = endpointParams[1];
      strictEqual(apiVersionParam.clientDefaultValue, "v1.0");
      strictEqual(apiVersionParam.urlEncode, false);
      strictEqual(apiVersionParam.nameInClient, "apiVersion");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.kind, "endpoint");
      deepStrictEqual(client.apiVersions, ["v1.0"]);

      const credentialParam = initialization.properties.filter(
        (p): p is SdkCredentialParameter => p.kind === "credential"
      )[0];
      strictEqual(credentialParam.nameInClient, "credential");
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.endpoint, "http://localhost:3000");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 3);
      strictEqual(client.apiVersions.length, 1);
      strictEqual(client.apiVersions[0], "2022-12-01-preview");

      const apiVersionParam = initialization.properties.filter((p) => p.isApiVersionParam)[0];
      strictEqual(apiVersionParam.nameInClient, "apiVersion");
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "ServiceClient");
      strictEqual(client.endpoint, "http://localhost:3000");
      const initialization = client.initialization;
      ok(initialization);
      strictEqual(initialization.properties.length, 3);
      strictEqual(client.apiVersions.length, 2);
      deepStrictEqual(client.apiVersions, ["2022-12-01-preview", "2022-12-01"]);

      const apiVersionParam = initialization.properties.filter((p) => p.isApiVersionParam)[0];
      strictEqual(apiVersionParam.nameInClient, "apiVersion");
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 2);

      const mainClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
      const operationGroup = sdkPackage.clients.find((c) => c.name === "MyOperationGroup");
      ok(mainClient && operationGroup);

      strictEqual(mainClient.methods.length, 1);
      ok(mainClient.initialization);
      strictEqual(mainClient.initialization.properties.length, 1);
      strictEqual(mainClient.initialization.properties[0].nameInClient, "endpoint");

      const clientAccessor = mainClient.methods[0];
      strictEqual(clientAccessor.kind, "clientaccessor");
      strictEqual(clientAccessor.access, "internal");
      strictEqual(clientAccessor.name, "getMyOperationGroup");
      strictEqual(clientAccessor.parameters.length, 0);
      strictEqual(clientAccessor.response, operationGroup);

      strictEqual(operationGroup.initialization, undefined);
      strictEqual(operationGroup.methods.length, 1);
      strictEqual(operationGroup.methods[0].name, "func");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 3);

      const mainClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
      const fooClient = sdkPackage.clients.find((c) => c.name === "Foo");
      const barClient = sdkPackage.clients.find((c) => c.name === "Bar");
      ok(mainClient && fooClient && barClient);

      strictEqual(mainClient.methods.length, 2);
      ok(mainClient.initialization);
      strictEqual(mainClient.initialization.properties.length, 1);
      strictEqual(mainClient.initialization.properties[0].nameInClient, "endpoint");

      const fooAccessor = mainClient.methods[0];
      strictEqual(fooAccessor.kind, "clientaccessor");
      strictEqual(fooAccessor.access, "internal");
      strictEqual(fooAccessor.name, "getFoo");
      strictEqual(fooAccessor.parameters.length, 0);
      strictEqual(fooAccessor.response, fooClient);

      const barAccessor = mainClient.methods[1];
      strictEqual(barAccessor.kind, "clientaccessor");
      strictEqual(barAccessor.access, "internal");
      strictEqual(barAccessor.name, "getBar");
      strictEqual(barAccessor.parameters.length, 0);
      strictEqual(barAccessor.response, barClient);

      strictEqual(fooClient.initialization, undefined);
      strictEqual(fooClient.methods.length, 1);
      strictEqual(fooClient.methods[0].kind, "clientaccessor");
      strictEqual(fooClient.methods[0].access, "internal");
      strictEqual(fooClient.methods[0].name, "getBar");
      strictEqual(fooClient.methods[0].parameters.length, 0);
      strictEqual(fooClient.methods[0].response, barClient);

      strictEqual(barClient.initialization, undefined);
      strictEqual(barClient.methods.length, 2);
      strictEqual(barClient.methods[0].kind, "basic");
      strictEqual(barClient.methods[0].name, "one");
      strictEqual(barClient.methods[1].kind, "basic");
      strictEqual(barClient.methods[1].name, "two");
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization?.properties.length, 1);
      strictEqual(client.initialization.properties[0].nameInClient, "endpoint");

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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const client = sdkPackage.clients[0];

      strictEqual(client.initialization?.properties.length, 2);
      strictEqual(client.initialization.properties[0].nameInClient, "endpoint");
      const clientApiVersionParam = client.initialization.properties[1];
      strictEqual(clientApiVersionParam.nameInClient, "apiVersion");
      strictEqual(clientApiVersionParam.onClient, true);
      strictEqual(clientApiVersionParam.optional, false);
      strictEqual(clientApiVersionParam.kind, "method");
      strictEqual(clientApiVersionParam.clientDefaultValue, undefined);
      strictEqual(clientApiVersionParam.isApiVersionParam, true);
      strictEqual(clientApiVersionParam.type.kind, "string");

      strictEqual(sdkPackage.clients[0].methods.length, 1);
      const withApiVersion = sdkPackage.clients[0].methods[0];
      strictEqual(withApiVersion.kind, "basic");
      strictEqual(withApiVersion.parameters.length, 0);
      strictEqual(withApiVersion.operation.parameters.length, 1);

      const apiVersionParam = withApiVersion.operation.parameters[0];
      strictEqual(apiVersionParam.kind, "query");
      strictEqual(apiVersionParam.isApiVersionParam, true);
      strictEqual(apiVersionParam.optional, false);
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(apiVersionParam.type.kind, "string");
      strictEqual(apiVersionParam.clientDefaultValue, undefined);
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization?.properties.length, 1);
      strictEqual(client.initialization.properties[0].nameInClient, "endpoint");

      const withoutApiVersion = client.methods[0];
      strictEqual(withoutApiVersion.kind, "basic");
      strictEqual(withoutApiVersion.parameters.length, 0);
      strictEqual(withoutApiVersion.operation.parameters.length, 0);
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization?.properties.length, 2);
      strictEqual(client.initialization.properties[0].nameInClient, "endpoint");

      const clientApiVersionParam = client.initialization.properties[1];
      strictEqual(clientApiVersionParam.nameInClient, "apiVersion");
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
      strictEqual(withApiVersion.parameters.length, 0);
      strictEqual(withApiVersion.operation.parameters.length, 1);

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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const client = sdkPackage.clients[0];
      strictEqual(client.initialization?.properties.length, 2);
      strictEqual(client.initialization.properties[0].nameInClient, "endpoint");

      const clientApiVersionParam = client.initialization.properties[1];
      strictEqual(clientApiVersionParam.nameInClient, "apiVersion");
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
      strictEqual(withApiVersion.parameters.length, 0);
      strictEqual(withApiVersion.operation.parameters.length, 1);

      const apiVersionParam = withApiVersion.operation.parameters[0];
      strictEqual(apiVersionParam.kind, "path");
      strictEqual(apiVersionParam.serializedName, "apiVersion");
      strictEqual(apiVersionParam.nameInClient, "apiVersion");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "path");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 0);
      strictEqual(serviceOperation.exceptions["*"], undefined);

      strictEqual(serviceOperation.parameters.length, 1);
      const pathParam = serviceOperation.parameters[0];

      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "path");
      strictEqual(pathParam.nameInClient, "path");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");
      strictEqual(pathParam.urlEncode, true);
      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type, undefined);

      const correspondingMethodParams = method.getParameterMapping(pathParam);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.nameInClient, correspondingMethodParams[0].nameInClient);
    });

    it("header basic", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header header: string): void;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "header");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 0);
      strictEqual(serviceOperation.exceptions["*"], undefined);

      strictEqual(serviceOperation.parameters.length, 1);
      const headerParam = serviceOperation.parameters[0];

      strictEqual(headerParam.kind, "header");
      strictEqual(headerParam.serializedName, "header");
      strictEqual(headerParam.nameInClient, "header");
      strictEqual(headerParam.optional, false);
      strictEqual(headerParam.onClient, false);
      strictEqual(headerParam.isApiVersionParam, false);
      strictEqual(headerParam.type.kind, "string");
      strictEqual(headerParam.collectionFormat, undefined);

      const correspondingMethodParams = method.getParameterMapping(headerParam);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(headerParam.nameInClient, correspondingMethodParams[0].nameInClient);
    });

    it("header collection format", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header({format: "multi"}) header: string): void;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "query");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 0);
      strictEqual(serviceOperation.exceptions["*"], undefined);

      strictEqual(serviceOperation.parameters.length, 1);
      const queryParam = serviceOperation.parameters[0];
      strictEqual(queryParam.kind, "query");
      strictEqual(queryParam.serializedName, "query");
      strictEqual(queryParam.nameInClient, "query");
      strictEqual(queryParam.optional, false);
      strictEqual(queryParam.onClient, false);
      strictEqual(queryParam.isApiVersionParam, false);
      strictEqual(queryParam.type.kind, "string");
      strictEqual(queryParam.collectionFormat, undefined);

      const correspondingMethodParams = method.getParameterMapping(queryParam);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(queryParam.nameInClient, correspondingMethodParams[0].nameInClient);
    });

    it("query collection format", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@query({format: "multi"}) query: string): void;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.models[0].name, "Input");
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodBodyParam = method.parameters.find((x) => x.nameInClient === "body");
      ok(methodBodyParam);
      strictEqual(methodBodyParam.kind, "method");
      strictEqual(methodBodyParam.optional, false);
      strictEqual(methodBodyParam.onClient, false);
      strictEqual(methodBodyParam.isApiVersionParam, false);
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters.find(
        (x) => x.nameInClient === "contentType"
      );
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.type.kind, "constant");
      strictEqual(methodContentTypeParam.onClient, false);
      strictEqual(methodContentTypeParam.optional, false);

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 1);
      const bodyParameter = serviceOperation.bodyParams[0];
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);

      const correspondingMethodParams = method.getParameterMapping(bodyParameter);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(bodyParameter.nameInClient, correspondingMethodParams[0].nameInClient);

      strictEqual(serviceOperation.parameters.length, 1);
      const contentTypeParam = serviceOperation.parameters[0];
      strictEqual(contentTypeParam.nameInClient, "contentType");
      strictEqual(contentTypeParam.serializedName, "Content-Type");
      strictEqual(contentTypeParam.clientDefaultValue, undefined);
      strictEqual(contentTypeParam.onClient, false);
      strictEqual(contentTypeParam.optional, false);

      const correspondingContentTypeMethodParams = method.getParameterMapping(contentTypeParam);
      strictEqual(correspondingContentTypeMethodParams.length, 1);
      strictEqual(correspondingContentTypeMethodParams[0], methodContentTypeParam);
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.models[0].name, "Input");
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodBodyParam = method.parameters.find((x) => x.nameInClient === "body");
      ok(methodBodyParam);
      strictEqual(methodBodyParam.kind, "method");
      strictEqual(methodBodyParam.optional, true);
      strictEqual(methodBodyParam.onClient, false);
      strictEqual(methodBodyParam.isApiVersionParam, false);
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters.find(
        (x) => x.nameInClient === "contentType"
      );
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.type.kind, "constant");
      strictEqual(methodContentTypeParam.onClient, false);
      strictEqual(methodContentTypeParam.optional, false);

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 1);
      const bodyParameter = serviceOperation.bodyParams[0];
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, true);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);

      const correspondingMethodParams = method.getParameterMapping(bodyParameter);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(bodyParameter.nameInClient, correspondingMethodParams[0].nameInClient);

      strictEqual(serviceOperation.parameters.length, 1);
      const contentTypeParam = serviceOperation.parameters[0];
      strictEqual(contentTypeParam.nameInClient, "contentType");
      strictEqual(contentTypeParam.serializedName, "Content-Type");
      strictEqual(contentTypeParam.clientDefaultValue, undefined);
      strictEqual(contentTypeParam.onClient, false);
      strictEqual(contentTypeParam.optional, false);

      const correspondingContentTypeMethodParams = method.getParameterMapping(contentTypeParam);
      strictEqual(correspondingContentTypeMethodParams.length, 1);
      strictEqual(correspondingContentTypeMethodParams[0], methodContentTypeParam);
    });

    it("body spread", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(...Input): void;
        `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters.find((x) => x.nameInClient === "key");
      ok(methodParam);
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const contentTypeParam = method.parameters.find((x) => x.nameInClient === "contentType");
      ok(contentTypeParam);
      strictEqual(contentTypeParam.clientDefaultValue, undefined);
      strictEqual(contentTypeParam.type.kind, "constant");
      strictEqual(contentTypeParam.onClient, false);

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 1);
      const bodyParameter = serviceOperation.bodyParams[0];
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type, sdkPackage.models[0]);

      const correspondingMethodParams = method.getParameterMapping(bodyParameter);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(
        bodyParameter.type.properties[0].nameInClient,
        correspondingMethodParams[0].nameInClient
      );
    });

    it("body alias spread", async () => {
      await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        alias BodyParameter = {
          name: string;
        };

        op myOp(...BodyParameter): void;
        `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters.find((x) => x.nameInClient === "name");
      ok(methodParam);
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const contentTypeMethodParam = method.parameters.find(
        (x) => x.nameInClient === "contentType"
      );
      ok(contentTypeMethodParam);
      strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
      strictEqual(contentTypeMethodParam.type.kind, "constant");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 1);
      const bodyParameter = serviceOperation.bodyParams[0];
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(bodyParameter.type.properties.length, 1);
      strictEqual(bodyParameter.type.properties[0].nameInClient, "name");

      const correspondingMethodParams = method.getParameterMapping(bodyParameter);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(
        bodyParameter.type.properties[0].nameInClient,
        correspondingMethodParams[0].nameInClient
      );
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

      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.models.length, 1);

      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "myOp");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "options");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "model");

      const requestOptionsModel = methodParam.type;
      strictEqual(requestOptionsModel.name, "RequestOptions");
      strictEqual(requestOptionsModel.properties.length, 3);

      const headerParamProp = requestOptionsModel.properties.find(
        (x): x is SdkHeaderParameter => x.nameInClient === "header"
      );
      ok(headerParamProp);
      strictEqual(headerParamProp.kind, "header");
      strictEqual(headerParamProp.nameInClient, "header");
      strictEqual(headerParamProp.optional, false);
      strictEqual(headerParamProp.onClient, false);
      strictEqual(headerParamProp.type.kind, "string");

      const queryParamProp = requestOptionsModel.properties.find(
        (x): x is SdkQueryParameter => x.nameInClient === "query"
      );
      ok(queryParamProp);
      strictEqual(queryParamProp.kind, "query");
      strictEqual(queryParamProp.nameInClient, "query");
      strictEqual(queryParamProp.optional, false);
      strictEqual(queryParamProp.onClient, false);
      strictEqual(queryParamProp.type.kind, "string");

      const bodyParamProp = requestOptionsModel.properties.find(
        (x): x is SdkBodyParameter => x.nameInClient === "body"
      );
      ok(bodyParamProp);
      strictEqual(bodyParamProp.kind, "body");
      strictEqual(bodyParamProp.nameInClient, "body");
      strictEqual(bodyParamProp.optional, false);
      strictEqual(bodyParamProp.onClient, false);
      strictEqual(bodyParamProp.type.kind, "string");
      deepStrictEqual(bodyParamProp.contentTypes, ["application/json"]);
      strictEqual(bodyParamProp.defaultContentType, "application/json");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "contentType");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "constant");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 3);

      strictEqual(serviceOperation.bodyParams.length, 1);
      const correspondingBodyParams = method.getParameterMapping(serviceOperation.bodyParams[0]);
      strictEqual(correspondingBodyParams.length, 1);
      strictEqual(correspondingBodyParams[0].nameInClient, bodyParamProp.nameInClient);

      const parameters = serviceOperation.parameters;
      strictEqual(parameters.length, 3);

      const headerParams = parameters.filter((x): x is SdkHeaderParameter => x.kind === "header");
      strictEqual(headerParams.length, 2);
      let correspondingHeaderParams = method.getParameterMapping(headerParams[0]);
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].nameInClient, headerParamProp.nameInClient);

      correspondingHeaderParams = method.getParameterMapping(headerParams[1]);
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].nameInClient, "contentType");

      const queryParams = parameters.filter((x): x is SdkQueryParameter => x.kind === "query");
      strictEqual(queryParams.length, 1);
      const correspondingQueryParams = method.getParameterMapping(queryParams[0]);
      strictEqual(correspondingQueryParams.length, 1);
      strictEqual(correspondingQueryParams[0].nameInClient, queryParamProp.nameInClient);
    });

    it("content type", async () => {
      await runner.compileWithBuiltInService(`
      @patch op patchNull(@body body: string): void;
        `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "patchNull");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "body");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "contentType");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "constant");
      strictEqual(methodParam.type.value, "application/json");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);

      strictEqual(serviceOperation.bodyParams.length, 1);
      const correspondingBodyParams = method.getParameterMapping(serviceOperation.bodyParams[0]);
      strictEqual(correspondingBodyParams.length, 1);
      strictEqual(correspondingBodyParams[0].nameInClient, "body");

      strictEqual(serviceOperation.parameters.length, 1);
      const correspondingHeaderParams = method.getParameterMapping(serviceOperation.parameters[0]);
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].nameInClient, "contentType");
    });
    it("ensure content type is a constant if only one possibility", async () => {
      await runner.compileWithBuiltInService(`
      model DefaultDatetimeProperty {
        value: utcDateTime;
      }
      @post op default(@body body: DefaultDatetimeProperty): void;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 2);
      const methodBodyParam = method.parameters[0];
      strictEqual(methodBodyParam.nameInClient, "body");
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters[1];
      strictEqual(methodContentTypeParam.nameInClient, "contentType");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.bodyParams.length, 1);
      const serviceBodyParam = serviceOperation.bodyParams[0];
      strictEqual(serviceBodyParam.kind, "body");
      strictEqual(serviceBodyParam.contentTypes.length, 1);
      strictEqual(serviceBodyParam.defaultContentType, "application/json");
      strictEqual(serviceBodyParam.contentTypes[0], "application/json");
      deepStrictEqual(method.getParameterMapping(serviceBodyParam)[0], methodBodyParam);

      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.nameInClient, "contentType");
      strictEqual(serviceContentTypeParam.serializedName, "Content-Type");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "application/json");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");
      deepStrictEqual(
        method.getParameterMapping(serviceContentTypeParam)[0],
        methodContentTypeParam
      );
    });

    it("ensure accept is a constant if only one possibility (json)", async () => {
      await runner.compileWithBuiltInService(`
      model DefaultDatetimeProperty {
        value: utcDateTime;
      }
      @get op default(): DefaultDatetimeProperty;
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 1);
      const methodAcceptParam = method.parameters[0];
      strictEqual(methodAcceptParam.nameInClient, "accept");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.nameInClient, "accept");
      strictEqual(serviceContentTypeParam.serializedName, "Accept");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "application/json");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");

      strictEqual(Object.keys(serviceOperation.responses).length, 1);
      const response = serviceOperation.responses[200];
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 1);
      const methodAcceptParam = method.parameters[0];
      strictEqual(methodAcceptParam.nameInClient, "accept");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.nameInClient, "accept");
      strictEqual(serviceContentTypeParam.serializedName, "Accept");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "image/png");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");

      strictEqual(Object.keys(serviceOperation.responses).length, 1);
      const response = serviceOperation.responses[200];
      strictEqual(response.kind, "http");
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(response.contentTypes?.length, 1);
      strictEqual(response.contentTypes[0], "image/png");
      strictEqual(response.defaultContentType, "image/png");

      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type?.kind, "bytes");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "delete");
      const serviceResponses = method.operation.responses;
      strictEqual(Object.keys(serviceResponses).length, 1);

      const voidResponse = serviceResponses[204];
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions["*"];
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(errorResponse.type, sdkPackage.models[0]);

      strictEqual(method.response.type, undefined);
      strictEqual(method.getResponseMapping(), undefined);
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 2);
      strictEqual(method.name, "create");
      const serviceResponses = method.operation.responses;
      strictEqual(Object.keys(serviceResponses).length, 1);

      const createResponse = serviceResponses[200];
      strictEqual(createResponse.kind, "http");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(createResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions["*"];
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
      strictEqual(method.getResponseMapping(), undefined);
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "operation");
      const serviceResponses = method.operation.responses;
      strictEqual(Object.keys(serviceResponses).length, 1);

      strictEqual(method.parameters.length, 1);

      const createResponse = serviceResponses[200];
      strictEqual(createResponse.kind, "http");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(createResponse.headers.length, 1);
      strictEqual(createResponse.headers[0].serializedName, "id");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(method.getResponseMapping(), undefined);

      strictEqual(method.response.kind, "method");
      const methodResponseType = method.response.type;
      ok(methodResponseType);
      strictEqual(
        methodResponseType,
        sdkPackage.models.find((x) => x.name === "Widget")
      );
      strictEqual(methodResponseType.properties.length, 2);
      strictEqual(methodResponseType.properties.filter((x) => x.kind === "header").length, 1);
    });
    it("NoContentResponse", async () => {
      await runner.compileWithBuiltInService(
        `
        @delete op delete(@path id: string): NoContentResponse;
        `
      );
      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "delete");
      const serviceResponses = method.operation.responses;
      strictEqual(Object.keys(serviceResponses).length, 1);

      const voidResponse = serviceResponses[204];
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);

      strictEqual(method.response.type, undefined);
      strictEqual(method.getResponseMapping(), undefined);
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

      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "create");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 5);
      deepStrictEqual(
        method.parameters.map((x) => x.nameInClient),
        ["id", "weight", "color", "contentType", "accept"]
      );

      const bodyParameter = method.operation.bodyParams[0];
      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.nameInClient, "body");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(bodyParameter.type.name, "Widget");

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

      const contentTypeMethodParam = method.parameters.find(
        (x) => x.nameInClient === "contentType"
      );
      ok(contentTypeMethodParam);
      strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
      strictEqual(contentTypeMethodParam.onClient, false);
      strictEqual(contentTypeMethodParam.optional, false);

      strictEqual(method.getParameterMapping(contentTypeOperationParam)[0], contentTypeMethodParam);

      const acceptOperationParam = headerParams.find((x) => x.serializedName === "Accept");
      ok(acceptOperationParam);
      strictEqual(acceptOperationParam.clientDefaultValue, undefined);
      strictEqual(acceptOperationParam.clientDefaultValue, undefined);
      strictEqual(acceptOperationParam.onClient, false);
      strictEqual(acceptOperationParam.optional, false);

      const acceptMethodParam = method.parameters.find((x) => x.nameInClient === "accept");
      ok(acceptMethodParam);
      strictEqual(acceptMethodParam.clientDefaultValue, undefined);
      strictEqual(acceptMethodParam.onClient, false);
      strictEqual(acceptMethodParam.optional, false);

      strictEqual(method.getParameterMapping(acceptOperationParam)[0], acceptMethodParam);
    });
    it("vanilla widget read", async () => {
      await compileVanillaWidgetService(runner, "@get read(@path id: string): Widget | Error;");

      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "read");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodIdParam = method.parameters.find((x) => x.nameInClient === "id");
      ok(methodIdParam);
      strictEqual(methodIdParam.kind, "method");
      strictEqual(methodIdParam.optional, false);
      strictEqual(methodIdParam.onClient, false);
      strictEqual(methodIdParam.isApiVersionParam, false);
      strictEqual(methodIdParam.type.kind, "string");

      const methodAcceptParam = method.parameters.find((x) => x.nameInClient === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);

      const serviceOperation = method.operation;

      strictEqual(serviceOperation.parameters.length, 2);
      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.nameInClient, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const operationAcceptParam = serviceOperation.parameters.find(
        (x) => x.kind === "header" && x.serializedName === "Accept"
      );
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);

      strictEqual(method.getParameterMapping(operationAcceptParam)[0], methodAcceptParam);

      const correspondingMethodParams = method.getParameterMapping(pathParam);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.nameInClient, correspondingMethodParams[0].nameInClient);
    });
    it("vanilla widget update", async () => {
      await compileVanillaWidgetService(runner, "@patch update(...Widget): Widget | Error;");

      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "update");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 5);

      const methodParamId = method.parameters[0];
      strictEqual(methodParamId.kind, "method");
      strictEqual(methodParamId.nameInClient, "id");
      strictEqual(methodParamId.optional, false);
      strictEqual(methodParamId.onClient, false);
      strictEqual(methodParamId.isApiVersionParam, false);
      strictEqual(methodParamId.type.kind, "string");

      const methodParamWeight = method.parameters[1];
      strictEqual(methodParamWeight.kind, "method");
      strictEqual(methodParamWeight.nameInClient, "weight");
      strictEqual(methodParamWeight.optional, false);
      strictEqual(methodParamWeight.onClient, false);
      strictEqual(methodParamWeight.isApiVersionParam, false);
      strictEqual(methodParamWeight.type.kind, "int32");

      const methodParamColor = method.parameters[2];
      strictEqual(methodParamColor.kind, "method");
      strictEqual(methodParamColor.nameInClient, "color");
      strictEqual(methodParamColor.optional, false);
      strictEqual(methodParamColor.onClient, false);
      strictEqual(methodParamColor.isApiVersionParam, false);
      strictEqual(methodParamColor.type.kind, "enum");

      const methodContentTypeParam = method.parameters.find(
        (x) => x.nameInClient === "contentType"
      );
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.optional, false);

      const methodAcceptParam = method.parameters.find((x) => x.nameInClient === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);
      strictEqual(methodAcceptParam.optional, false);

      const serviceOperation = method.operation;

      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.nameInClient, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      strictEqual(serviceOperation.bodyParams.length, 1);
      const bodyParameter = serviceOperation.bodyParams[0];
      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);

      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(bodyParameter.type, sdkPackage.models.filter((m) => m.name === "Widget")[0]);

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

      const correspondingMethodParams = method
        .getParameterMapping(bodyParameter)
        .map((x) => x.nameInClient);
      deepStrictEqual(correspondingMethodParams, ["weight", "color"]);
      deepStrictEqual(
        bodyParameter.type.properties.map((p) => p.nameInClient),
        ["id", "weight", "color"]
      );

      strictEqual(method.getParameterMapping(operationContentTypeParam)[0], methodContentTypeParam);
      strictEqual(method.getParameterMapping(operationAcceptParam)[0], methodAcceptParam);
    });
    it("vanilla widget delete", async () => {
      await compileVanillaWidgetService(runner, "@delete delete(@path id: string): void | Error;");

      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "delete");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.nameInClient, "id");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;

      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.nameInClient, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const correspondingMethodParams = method.getParameterMapping(pathParam);
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.nameInClient, correspondingMethodParams[0].nameInClient);
    });
    it("vanilla widget list", async () => {
      await compileVanillaWidgetService(runner, "@get list(): Widget[] | Error;");

      const sdkPackage = runner.context.experimental_sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "list");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);
      strictEqual(method.operation.bodyParams.length, 0);
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      const parentClient = sdkPackage.clients.filter((c) => c.initialization !== undefined)[0];
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(parentClient.name, "WidgetManagerClient");
      strictEqual(method.name, "getWidget");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 7);

      // TODO: what should we do with eTags and client request id?
      const methodWidgetName = method.parameters.find((p) => p.nameInClient === "widgetName");
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
      strictEqual(pathParam.nameInClient, "widgetName");
      strictEqual(pathParam.serializedName, "widgetName");
      strictEqual(pathParam.onClient, false);
      strictEqual(method.getParameterMapping(pathParam).length, 1);
      strictEqual(method.getParameterMapping(pathParam)[0], methodWidgetName);

      const queryParam = method.operation.parameters.find((x) => x.kind === "query");
      ok(queryParam);
      strictEqual(queryParam.isApiVersionParam, true);
      strictEqual(queryParam.nameInClient, "apiVersion");
      strictEqual(queryParam.serializedName, "api-version");
      strictEqual(queryParam.onClient, true);
      strictEqual(method.getParameterMapping(queryParam).length, 1);
      ok(parentClient.initialization);
      strictEqual(
        method.getParameterMapping(queryParam)[0],
        parentClient.initialization.properties.find((x) => x.isApiVersionParam)
      );

      const methodAcceptParam = method.parameters.find((x) => x.nameInClient === "accept");
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
      strictEqual(method.getParameterMapping(operationAcceptParam)[0], methodAcceptParam);

      strictEqual(
        method.parameters.some((x) => x.nameInClient === "contentType"),
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 2);
      const client = sdkPackage.clients.filter((c) => c.initialization === undefined)[0];
      const parentClient = sdkPackage.clients.filter((c) => c.initialization !== undefined)[0];
      strictEqual(client.methods.length, 2);

      // TEST GET STATUS
      const getStatus = client.methods.find((x) => x.name === "getWidgetOperationStatus");
      ok(getStatus);
      strictEqual(getStatus.name, "getWidgetOperationStatus");
      strictEqual(getStatus.kind, "basic");
      strictEqual(getStatus.parameters.length, 3);

      const methodWidgetName = getStatus.parameters.find((p) => p.nameInClient === "widgetName");
      ok(methodWidgetName);
      strictEqual(methodWidgetName.kind, "method");
      strictEqual(methodWidgetName.isApiVersionParam, false);
      deepStrictEqual(methodWidgetName.apiVersions, ["2022-08-30"]);
      strictEqual(methodWidgetName.onClient, false);
      strictEqual(methodWidgetName.optional, false);

      const methodOperationId = getStatus.parameters.find((p) => p.nameInClient === "operationId");
      ok(methodOperationId);
      strictEqual(methodOperationId.kind, "method");
      strictEqual(methodOperationId.isApiVersionParam, false);
      deepStrictEqual(methodOperationId.apiVersions, ["2022-08-30"]);
      strictEqual(methodOperationId.onClient, false);
      strictEqual(methodOperationId.optional, false);

      const methodAcceptParam = getStatus.parameters.find((x) => x.nameInClient === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);
      strictEqual(methodAcceptParam.onClient, false);
      strictEqual(methodAcceptParam.optional, false);

      strictEqual(getStatus.operation.parameters.length, 4);

      const pathParams = getStatus.operation.parameters.filter((x) => x.kind === "path");
      strictEqual(pathParams.length, 2);

      const pathParam1 = pathParams[0];
      strictEqual(pathParam1.kind, "path");
      strictEqual(pathParam1.nameInClient, "widgetName");
      strictEqual(pathParam1.serializedName, "widgetName");
      strictEqual(pathParam1.onClient, false);
      strictEqual(getStatus.getParameterMapping(pathParam1).length, 1);
      strictEqual(getStatus.getParameterMapping(pathParam1)[0], methodWidgetName);

      const pathParam2 = pathParams[1];
      strictEqual(pathParam2.kind, "path");
      strictEqual(pathParam2.nameInClient, "operationId");
      strictEqual(pathParam2.serializedName, "operationId");
      strictEqual(pathParam2.onClient, false);
      strictEqual(getStatus.getParameterMapping(pathParam2).length, 1);
      strictEqual(getStatus.getParameterMapping(pathParam2)[0], methodOperationId);

      const apiVersionParam = getStatus.operation.parameters.find((x) => x.kind === "query");
      ok(apiVersionParam);
      strictEqual(apiVersionParam.isApiVersionParam, true);
      strictEqual(apiVersionParam.nameInClient, "apiVersion");
      strictEqual(apiVersionParam.serializedName, "api-version");
      strictEqual(apiVersionParam.onClient, true);
      strictEqual(getStatus.getParameterMapping(apiVersionParam).length, 1);
      ok(parentClient.initialization);
      strictEqual(
        getStatus.getParameterMapping(apiVersionParam)[0],
        parentClient.initialization.properties.find((x) => x.isApiVersionParam)
      );

      const operationAcceptParam = getStatus.operation.parameters.find((x) => x.kind === "header");
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.nameInClient, "accept");
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);
      strictEqual(operationAcceptParam.onClient, false);
      strictEqual(operationAcceptParam.optional, false);
      strictEqual(getStatus.getParameterMapping(operationAcceptParam)[0], methodAcceptParam);

      const widgetModel = sdkPackage.models.find((x) => x.name === "Widget");

      // TEST POLLING
      const createOrUpdate = client.methods.find((x) => x.name === "createOrUpdateWidget");
      ok(createOrUpdate);
      strictEqual(createOrUpdate.kind, "lro");
      strictEqual(
        createOrUpdate.parameters.find((x) => x.nameInClient === "apiVersion"),
        undefined
      );
      deepStrictEqual(
        createOrUpdate.parameters.map((x) => x.nameInClient),
        [
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
        headerParams.map((x) => x.nameInClient),
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
      strictEqual(serviceOperation.bodyParams.length, 1);
      strictEqual(serviceOperation.bodyParams[0].nameInClient, "resource");
      strictEqual(serviceOperation.bodyParams[0].type, widgetModel);

      strictEqual(Object.keys(serviceOperation.responses).length, 2);
      const responseHeaders = [
        "Repeatability-Result",
        "ETag",
        "x-ms-client-request-id",
        "Operation-Location",
      ];
      const response200 = serviceOperation.responses[200];
      deepStrictEqual(
        response200.headers.map((x) => x.serializedName),
        responseHeaders
      );
      strictEqual(response200.type, widgetModel);

      const response201 = serviceOperation.responses[201];
      deepStrictEqual(
        response201.headers.map((x) => x.serializedName),
        responseHeaders
      );
      strictEqual(response201.type, widgetModel);

      const exception = serviceOperation.exceptions["*"];
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
      strictEqual(createOrUpdate.getResponseMapping(), "result");
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
      const sdkPackage = runnerWithCore.context.experimental_sdkPackage;
      strictEqual(sdkPackage.clients.length, 2);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.models[0].name, "Manufacturer");
      const widgetClient = sdkPackage.clients.find((c) => c.name === "Widgets");
      ok(widgetClient);
      strictEqual(widgetClient.initialization, undefined);
      strictEqual(widgetClient.methods.length, 1);
      const listManufacturers = widgetClient.methods[0];

      strictEqual(listManufacturers.name, "listManufacturers");
      strictEqual(listManufacturers.kind, "paging");
      strictEqual(listManufacturers.parameters.length, 2);
      deepStrictEqual(
        listManufacturers.parameters.map((x) => x.nameInClient),
        ["clientRequestId", "accept"]
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
      strictEqual(apiVersion.nameInClient, "apiVersion");
      strictEqual(apiVersion.serializedName, "api-version");
      strictEqual(apiVersion.onClient, true);

      const clientRequestId = operation.parameters.find(
        (x) => x.nameInClient === "clientRequestId"
      );
      ok(clientRequestId);
      strictEqual(clientRequestId.kind, "header");
      deepStrictEqual(
        listManufacturers.getParameterMapping(clientRequestId)[0],
        listManufacturers.parameters[0]
      );

      const accept = operation.parameters.find((x) => x.nameInClient === "accept");
      ok(accept);
      strictEqual(accept.kind, "header");
      deepStrictEqual(
        listManufacturers.getParameterMapping(accept)[0],
        listManufacturers.parameters[1]
      );

      strictEqual(Object.keys(operation.responses).length, 1);
      const response200 = operation.responses[200];
      strictEqual(response200.kind, "http");
      const pagingModel = response200.type;
      ok(pagingModel);
      strictEqual(pagingModel.kind, "model");
      strictEqual(pagingModel.name, "PagedManufacturer");
      strictEqual(pagingModel.properties.length, 3);

      const valueProperty = pagingModel.properties.find((x) => x.nameInClient === "value");
      ok(valueProperty);
      strictEqual(valueProperty.kind, "property");
      strictEqual(valueProperty.type.kind, "array");
      strictEqual(valueProperty.type.valueType, sdkPackage.models[0]);

      const nextLinkProperty = pagingModel.properties.find((x) => x.nameInClient === "nextLink");
      ok(nextLinkProperty);
      strictEqual(nextLinkProperty.kind, "property");
      strictEqual(nextLinkProperty.type.kind, "url");
      strictEqual(nextLinkProperty.serializedName, "nextLink");
      strictEqual(nextLinkProperty.serializedName, listManufacturers.nextLinkPath);

      const clientRequestIdProperty = pagingModel.properties.find(
        (x) => x.nameInClient === "clientRequestId"
      );
      ok(clientRequestIdProperty);
      strictEqual(clientRequestIdProperty.kind, "header");
    });
  });
});

function getServiceMethodOfClient(
  sdkPackage: SdkPackage<SdkHttpOperation>,
  numMethods: number = 1,
  methodIndex: number = 0
): SdkServiceMethod<SdkHttpOperation> {
  let client = sdkPackage.clients.filter((c) => c.initialization === undefined)[0];
  if (!client) {
    client = sdkPackage.clients.filter((c) => c.initialization !== undefined)[0];
  }
  strictEqual(client.methods.length, numMethods);
  const method = client.methods[methodIndex];
  strictEqual(["basic", "paging", "lro", "lropaging"].includes(method.kind), true);
  return method as SdkServiceMethod<SdkHttpOperation>;
}
