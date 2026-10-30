import { expectDiagnostics, resolveVirtualPath } from "@typespec/compiler/testing";
import { getAuthentication, getHttpOperation } from "@typespec/http";
import { ok } from "assert";
import { expect, it } from "vitest";
import { parse } from "yaml";
import { createTCGCContext } from "../../src/context.js";
import { type SdkClientType, UsageFlags } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const definitions = `
  model PublicAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;
  model GovernmentAuth is AadOauth2Auth<
    ["https://api.loganalytics.us/.default"],
    "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.us/common/oauth2/v2.0/token"
  >;
  model Configurations {
    government: { endpoint: "https://api.loganalytics.us"; authentication: GovernmentAuth };
    public: { endpoint: "https://api.loganalytics.io"; authentication: PublicAuth };
  }
`;

function getCredential(client: SdkClientType) {
  const credential = client.clientInitialization.parameters.find(
    (parameter) => parameter.kind === "credential",
  );
  ok(credential);
  return credential;
}

it.each(["python", "csharp", "java", "go", "ts"])(
  "projects paired configurations and default initialization for %s",
  async (language) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      @service @azureServiceConfigurations(Configurations)
      namespace Service { @get op read(): void; }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: `@azure-tools/typespec-${language}`,
    });
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    const catalog = client.clientInitialization.serviceConfigurations;
    expect(catalog?.defaultConfiguration).toBe("public");
    expect(catalog?.configurations.map((configuration) => configuration.name)).toEqual([
      "public",
      "government",
    ]);
    const government = catalog?.configurations[1];
    expect(government?.endpoint).toMatchObject({
      serverUrl: "https://api.loganalytics.us",
      templateArguments: [],
    });
    expect(government?.authentication.options[0].schemes[0]).toMatchObject({
      type: "oauth2",
      model: { name: "GovernmentAuth" },
      flows: [
        {
          tokenUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/token",
          scopes: [{ value: "https://api.loganalytics.us/.default" }],
        },
      ],
    });
    ok(government?.credential?.type.kind === "credential");
    expect(government.credential.type.scheme).toMatchObject({
      model: { name: "GovernmentAuth" },
      flows: [{ scopes: [{ value: "https://api.loganalytics.us/.default" }] }],
    });
    const credential = getCredential(client);
    expect(credential.type).toMatchObject({
      kind: "credential",
      scheme: {
        model: { name: "PublicAuth" },
        flows: [{ scopes: [{ value: "https://api.loganalytics.io/.default" }] }],
      },
    });
    const endpoint = client.clientInitialization.parameters.find(
      (parameter) => parameter.kind === "endpoint",
    );
    expect(endpoint?.type).toMatchObject({
      kind: "endpoint",
      templateArguments: [{ clientDefaultValue: "https://api.loganalytics.io" }],
    });
    expect(client.authentication?.options).toHaveLength(1);
    expect(getAuthentication(program, client.__raw.services[0])?.options).toHaveLength(2);
  },
);

it("keeps ordinary multi-flow OAuth scopes unchanged without a configuration catalog", async () => {
  const { program } = await AzureCoreTester.compile(`
    model ExplicitAuth is OAuth2Auth<[
      {
        type: OAuth2FlowType.implicit;
        authorizationUrl: "https://login.example.com/authorize";
        scopes: ["read"];
      },
      {
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/token";
        scopes: ["write", "read"];
      }
    ]>;
    @service @useAuth(ExplicitAuth)
    namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(client.clientInitialization).not.toHaveProperty("serviceConfigurations");
  const credential = getCredential(client);
  ok(credential.type.kind === "credential" && credential.type.scheme.type === "oauth2");
  expect(
    credential.type.scheme.flows.map((flow) => flow.scopes.map((scope) => scope.value)),
  ).toEqual([["read"], ["write", "read"]]);
});

it("preserves ordinary OR-of-AND authentication and client initialization order", async () => {
  const { program } = await AzureCoreTester.compile(`
    model Auth is AadOauth2Auth<["read"]>;
    @server("{endpoint}", "Service endpoint", {endpoint: url})
    @useAuth([Auth, ApiKeyAuth<ApiKeyLocation.header, "api-key">] | NoAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(client.clientInitialization).not.toHaveProperty("serviceConfigurations");
  expect(client.clientInitialization.parameters.map((parameter) => parameter.kind)).toEqual([
    "endpoint",
    "credential",
  ]);
  expect(
    client.authentication?.options.map((option) => option.schemes.map((scheme) => scheme.type)),
  ).toEqual([["oauth2", "apiKey"], ["noAuth"]]);
  const credential = getCredential(client);
  expect(credential.optional).toBe(false);
  ok(credential.type.kind === "union");
  expect(credential.type.variantTypes.map((type) => type.scheme.type)).toEqual([
    "oauth2",
    "apiKey",
    "noAuth",
  ]);
});

it("retains required instance endpoints and key/token alternatives in every configuration", async () => {
  const { program } = await AzureCoreTester.compile(`
        ${definitions}
        model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
        model SearchConfigurations {
          public: { endpoint: "{endpoint}"; parameters: { endpoint: url }; authentication: PublicAuth | Key };
          government: { endpoint: "{endpoint}"; parameters: { endpoint: url }; authentication: GovernmentAuth | Key };
        }
        @service @azureServiceConfigurations(SearchConfigurations)
        namespace Service { @get op read(): void; }
      `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  for (const configuration of client.clientInitialization.serviceConfigurations?.configurations ??
    []) {
    expect(configuration.endpoint).toMatchObject({
      serverUrl: "{endpoint}",
      templateArguments: [{ name: "endpoint", optional: false, clientDefaultValue: undefined }],
    });
    expect(
      configuration.authentication.options.map((option) =>
        option.schemes.map((scheme) => scheme.type),
      ),
    ).toEqual([["oauth2"], ["apiKey"]]);
    expect(configuration.credential?.type).toMatchObject({
      kind: "union",
      variantTypes: [
        { scheme: { type: "oauth2" } },
        { scheme: { type: "apiKey", name: "api-key" } },
      ],
    });
  }
  expect(getCredential(client).type).toMatchObject({ kind: "union", variantTypes: [{}, {}] });
});

it("keeps OR-of-AND requirements local to each configuration", async () => {
  const { program } = await AzureCoreTester.compile(`
        ${definitions}
        model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
        model CombinedConfigurations {
          public: { endpoint: "https://public.example.com"; authentication: [PublicAuth, Key] | NoAuth };
          government: { endpoint: "https://government.example.com"; authentication: [GovernmentAuth, Key] | NoAuth };
        }
        @service @azureServiceConfigurations(CombinedConfigurations)
        namespace Service { @get op read(): void; }
      `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const catalog = context.sdkPackage.clients[0].clientInitialization.serviceConfigurations;
  expect(catalog?.configurations).toHaveLength(2);
  for (const configuration of catalog!.configurations) {
    expect(
      configuration.authentication.options.map((option) =>
        option.schemes.map((scheme) => scheme.type),
      ),
    ).toEqual([["oauth2", "apiKey"], ["noAuth"]]);
    expect(configuration.credential?.optional).toBe(false);
  }
  expect(catalog?.configurations[0].credential).not.toBe(catalog?.configurations[1].credential);
});

it.each(["virtual", "auto-merged"])(
  "inherits a customized parent's catalog for %s children",
  async (kind) => {
    const { program } = await AzureCoreTester.compile(`
          ${definitions}
          @service @azureServiceConfigurations(Configurations)
          namespace Service {
            interface Operations { @get @route("/child") read(): void; }
          }
          model PrivateConfigurations {
            public: { endpoint: "https://private.example.com"; authentication: PublicAuth };
          }
          @azureServiceConfigurations(PrivateConfigurations)
          @client({name: "Customized", service: Service, autoMergeService: true})
          namespace Clients.Customized {}
          ${kind === "virtual" ? '@@clientLocation(Service.Operations.read, "Moved");' : ""}
        `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    const child = client.children?.find(
      (candidate) => candidate.name === (kind === "virtual" ? "Moved" : "Operations"),
    );
    ok(child);
    expect(child.clientInitialization.serviceConfigurations).toMatchObject({
      defaultConfiguration: "public",
      configurations: [{ endpoint: { serverUrl: "https://private.example.com" } }],
    });
    expect(child.clientInitialization.serviceConfigurations).not.toBe(
      client.clientInitialization.serviceConfigurations,
    );
  },
);

it("prefers a child namespace's catalog over a customized SDK parent", async () => {
  const { program } = await AzureCoreTester.compile(`
        ${definitions}
        model LocalConfigurations {
          public: { endpoint: "https://local.example.com"; authentication: GovernmentAuth };
        }
        @service @azureServiceConfigurations(Configurations)
        namespace Service {
          @azureServiceConfigurations(LocalConfigurations)
          namespace Operations { @get @route("/child") op read(): void; }
        }
        model PrivateConfigurations {
          public: { endpoint: "https://private.example.com"; authentication: PublicAuth };
        }
        @azureServiceConfigurations(PrivateConfigurations)
        @client({name: "Customized", service: Service, autoMergeService: true})
        namespace Clients.Customized {}
      `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  const child = client.children?.[0];
  expect(client.clientInitialization.serviceConfigurations).toMatchObject({
    defaultConfiguration: "public",
    configurations: [{ endpoint: { serverUrl: "https://private.example.com" } }],
  });
  expect(child?.clientInitialization.serviceConfigurations).toMatchObject({
    defaultConfiguration: "public",
    configurations: [{ endpoint: { serverUrl: "https://local.example.com" } }],
  });
  ok(child);
  expect(getCredential(child).type).toMatchObject({
    kind: "credential",
    scheme: { model: { name: "GovernmentAuth" } },
  });
});

it("preserves matching catalogs on merged children and grandchildren", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    model LocalConfigurations {
      public: { endpoint: "https://local.example.com"; authentication: GovernmentAuth };
    }
    model NestedConfigurations {
      public: { endpoint: "https://nested.example.com"; authentication: GovernmentAuth };
    }
    model PrivateConfigurations {
      public: { endpoint: "https://private.example.com"; authentication: PublicAuth };
    }
    @service @azureServiceConfigurations(Configurations)
    namespace First {
      @azureServiceConfigurations(LocalConfigurations)
      namespace Operations {
        @azureServiceConfigurations(NestedConfigurations)
        namespace Nested { @get @route("/first") op first(): void; }
      }
    }
    @service @azureServiceConfigurations(Configurations)
    namespace Second {
      @azureServiceConfigurations(LocalConfigurations)
      namespace Operations {
        @azureServiceConfigurations(NestedConfigurations)
        namespace Nested { @get @route("/second") op second(): void; }
      }
    }
    @azureServiceConfigurations(PrivateConfigurations)
    @client({service: [First, Second], autoMergeService: true})
    namespace Combined {}
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const root = context.sdkPackage.clients[0];
  const child = root.children?.[0];
  const grandchild = child?.children?.[0];
  expect(root.clientInitialization.serviceConfigurations).toMatchObject({
    defaultConfiguration: "public",
    configurations: [{ endpoint: { serverUrl: "https://private.example.com" } }],
  });
  expect(child?.clientInitialization.serviceConfigurations).toMatchObject({
    defaultConfiguration: "public",
    configurations: [{ endpoint: { serverUrl: "https://local.example.com" } }],
  });
  expect(grandchild?.clientInitialization.serviceConfigurations).toMatchObject({
    defaultConfiguration: "public",
    configurations: [{ endpoint: { serverUrl: "https://nested.example.com" } }],
  });
  ok(child && grandchild);
  for (const client of [child, grandchild]) {
    expect(getCredential(client).type).toMatchObject({
      kind: "credential",
      scheme: { model: { name: "GovernmentAuth" } },
    });
  }
  expect(grandchild.methods.map((method) => method.name)).toEqual(["first", "second"]);
});

it.each(["child", "grandchild"])(
  "rejects conflicting catalogs on merged %s namespaces",
  async (level) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      model FirstLocal {
        public: { endpoint: "https://first.example.com"; authentication: GovernmentAuth };
      }
      model SecondLocal {
        public: { endpoint: "https://second.example.com"; authentication: GovernmentAuth };
      }
      @service @azureServiceConfigurations(Configurations)
      namespace First {
        @azureServiceConfigurations(FirstLocal)
        namespace Operations {
          ${level === "grandchild" ? "@azureServiceConfigurations(FirstLocal)" : ""}
          namespace Nested { @get @route("/first") op first(): void; }
        }
      }
      @service @azureServiceConfigurations(Configurations)
      namespace Second {
        @azureServiceConfigurations(${level === "child" ? "SecondLocal" : "FirstLocal"})
        namespace Operations {
          ${level === "grandchild" ? "@azureServiceConfigurations(SecondLocal)" : ""}
          namespace Nested { @get @route("/second") op second(): void; }
        }
      }
      @client({service: [First, Second], autoMergeService: true})
      namespace Combined {}
    `);
    await createSdkContextForTester(program);
    const conflictingClientCount = level === "child" ? 2 : 1;
    expectDiagnostics(
      program.diagnostics,
      Array.from({ length: conflictingClientCount }, () => ({
        code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service",
      })),
    );
  },
);

it("does not overwrite explicit operation and interface authentication", async () => {
  const { program } = await AzureCoreTester.compile(`
        ${definitions}
        @service @azureServiceConfigurations(Configurations)
        namespace Service {
          @useAuth(NoAuth) @get @route("/anonymous") op anonymous(): void;
          @useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
          interface Operations { @get @route("/key") read(): void; }
        }
      `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const service = context.sdkPackage.clients[0].__raw.services[0];
  const anonymous = service.operations.get("anonymous")!;
  const keyed = service.interfaces.get("Operations")!.operations.get("read")!;
  expect(getHttpOperation(program, anonymous)[0].authentication?.options[0].schemes[0].type).toBe(
    "noAuth",
  );
  expect(getHttpOperation(program, keyed)[0].authentication?.options[0].schemes[0].type).toBe(
    "apiKey",
  );
});

it.each(["WithoutConfigurations, Configured", "Configured, WithoutConfigurations"])(
  "rejects a missing merged catalog with services ordered %s",
  async (services) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      model SingleConfiguration {
        public: { endpoint: "https://api.loganalytics.io"; authentication: PublicAuth };
      }
      @service @server("https://api.loganalytics.io")
      namespace WithoutConfigurations { @get @route("/first") op first(): void; }
      @service @azureServiceConfigurations(SingleConfiguration)
      namespace Configured { @get @route("/second") op second(): void; }
      @client({service: [${services}], autoMergeService: true})
      namespace Combined {}
    `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    expectDiagnostics(program.diagnostics, [
      { code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" },
    ]);
  },
);

it("merges equivalent catalogs independently of non-default declaration order", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    model ChinaAuth is AadOauth2Auth<["china.read"]>;
    model FirstConfigurations {
      government: { endpoint: "https://api.loganalytics.us"; authentication: GovernmentAuth };
      public: { endpoint: "https://api.loganalytics.io"; authentication: PublicAuth };
      china: { endpoint: "https://china.example.com"; authentication: ChinaAuth };
    }
    model SecondConfigurations {
      china: { endpoint: "https://china.example.com"; authentication: ChinaAuth };
      public: { endpoint: "https://api.loganalytics.io"; authentication: PublicAuth };
      government: { endpoint: "https://api.loganalytics.us"; authentication: GovernmentAuth };
    }
    @service @azureServiceConfigurations(FirstConfigurations)
    namespace First { @get @route("/first") op first(): void; }
    @service @azureServiceConfigurations(SecondConfigurations)
    namespace Second { @get @route("/second") op second(): void; }
    @client({service: [First, Second], autoMergeService: true})
    namespace Combined {}
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  const catalog = client.clientInitialization.serviceConfigurations;
  expect(catalog?.defaultConfiguration).toBe("public");
  expect(catalog?.configurations.map((configuration) => configuration.name)).toEqual([
    "public",
    "government",
    "china",
  ]);
  expect(client.methods.map((method) => method.name)).toEqual(["first", "second"]);
});

it("rejects merged catalogs with different password-flow token URLs", async () => {
  const { program } = await AzureCoreTester.compile(`
    model FirstAuth is OAuth2Auth<[{
      type: OAuth2FlowType.password;
      tokenUrl: "https://first.example.com/token";
      scopes: ["read"];
    }]>;
    model SecondAuth is OAuth2Auth<[{
      type: OAuth2FlowType.password;
      tokenUrl: "https://second.example.com/token";
      scopes: ["read"];
    }]>;
    model FirstConfigurations {
      public: { endpoint: "https://service.example.com"; authentication: FirstAuth };
    }
    model SecondConfigurations {
      public: { endpoint: "https://service.example.com"; authentication: SecondAuth };
    }
    @service @azureServiceConfigurations(FirstConfigurations)
    namespace First { @get @route("/first") op first(): void; }
    @service @azureServiceConfigurations(SecondConfigurations)
    namespace Second { @get @route("/second") op second(): void; }
    @client({service: [First, Second], autoMergeService: true})
    namespace Combined {}
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  expectDiagnostics(program.diagnostics, [
    { code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" },
  ]);
});

it.each(["scopes", "flows", "schemes", "options"])(
  "merges equivalent authentication with reordered %s without changing metadata order",
  async (reordered) => {
    const flows = [
      `{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/token";
        scopes: ["write", "read"];
      }`,
      `{
        type: OAuth2FlowType.authorizationCode;
        authorizationUrl: "https://login.example.com/authorize";
        tokenUrl: "https://login.example.com/token";
        scopes: ["write", "read"];
      }`,
    ];
    const secondFlows = flows.map((flow) =>
      reordered === "scopes" ? flow.replace('["write", "read"]', '["read", "write"]') : flow,
    );
    if (reordered === "flows") secondFlows.reverse();
    const secondGroup = reordered === "schemes" ? "[Key, SecondAuth]" : "[SecondAuth, Key]";
    const secondRequirements =
      reordered === "options" ? `NoAuth | ${secondGroup}` : `${secondGroup} | NoAuth`;
    const { program } = await AzureCoreTester.compile(`
      model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
      model FirstAuth is OAuth2Auth<[${flows.join(",")}]>;
      model SecondAuth is OAuth2Auth<[${secondFlows.join(",")}]>;
      model FirstConfigurations {
        public: { endpoint: "https://example.com"; authentication: [FirstAuth, Key] | NoAuth };
      }
      model SecondConfigurations {
        public: { endpoint: "https://example.com"; authentication: ${secondRequirements} };
      }
      @service @azureServiceConfigurations(FirstConfigurations)
      namespace First { @get @route("/first") op first(): void; }
      @service @azureServiceConfigurations(SecondConfigurations)
      namespace Second { @get @route("/second") op second(): void; }
      @client({service: [First, Second], autoMergeService: true})
      namespace Combined {}
    `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    expect(client.methods.map((method) => method.name)).toEqual(["first", "second"]);
    const auth =
      client.clientInitialization.serviceConfigurations?.configurations[0].authentication;
    expect(
      auth?.options.map((option) => option.schemes.map((scheme) => scheme.model.name)),
    ).toEqual([["FirstAuth", "Key"], ["NoAuth"]]);
    const scheme = auth?.options[0].schemes[0];
    ok(scheme?.type === "oauth2");
    expect(scheme.flows.map((flow) => flow.type)).toEqual([
      "clientCredentials",
      "authorizationCode",
    ]);
    expect(scheme.flows.map((flow) => flow.scopes.map((scope) => scope.value))).toEqual([
      ["write", "read"],
      ["write", "read"],
    ]);
  },
);

it.each([false, true])(
  "compares OpenID Connect scopes in OAuth configurations: conflict=%s",
  async (conflict) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      model FirstIdentity is OpenIdConnectAuth<"https://login.example.com", ["read", "write"]>;
      model SecondIdentity is OpenIdConnectAuth<
        "https://login.example.com",
        ["${conflict ? "other" : "write"}", "read"]
      >;
      model FirstConfigurations {
        public: {
          endpoint: "https://example.com";
          authentication: PublicAuth | FirstIdentity;
        };
      }
      model SecondConfigurations {
        public: {
          endpoint: "https://example.com";
          authentication: PublicAuth | SecondIdentity;
        };
      }
      @service @azureServiceConfigurations(FirstConfigurations)
      namespace First { @get @route("/first") op first(): void; }
      @service @azureServiceConfigurations(SecondConfigurations)
      namespace Second { @get @route("/second") op second(): void; }
      @client({service: [First, Second], autoMergeService: true})
      namespace Combined {}
    `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    expectDiagnostics(
      program.diagnostics,
      conflict
        ? [{ code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" }]
        : [],
    );
  },
);

it.each([
  {
    name: "AND/OR grouping",
    first: "[PublicAuth, Key] | GovernmentAuth",
    second: "PublicAuth | [Key, GovernmentAuth]",
  },
  {
    name: "repeated schemes",
    first: "[PublicAuth, PublicAuth, Key]",
    second: "[PublicAuth, Key, Key]",
  },
])("rejects merged authentication with different $name", async ({ first, second }) => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
    model FirstConfigurations {
      public: { endpoint: "https://example.com"; authentication: ${first} };
    }
    model SecondConfigurations {
      public: { endpoint: "https://example.com"; authentication: ${second} };
    }
    @service @azureServiceConfigurations(FirstConfigurations)
    namespace First { @get @route("/first") op first(): void; }
    @service @azureServiceConfigurations(SecondConfigurations)
    namespace Second { @get @route("/second") op second(): void; }
    @client({service: [First, Second], autoMergeService: true})
    namespace Combined {}
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  expectDiagnostics(program.diagnostics, [
    { code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" },
  ]);
});

it("projects configuration-specific authentication and credential alternatives", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
    model GovernmentTokenAuth is OAuth2Auth<[{
      type: OAuth2FlowType.clientCredentials;
      tokenUrl: "https://government.example.com/token";
      scopes: ["government.read"];
    }]>;
    model MixedConfigurations {
      public: {
        endpoint: "https://public.example.com";
        authentication: [PublicAuth, Key] | NoAuth;
      };
      government: {
        endpoint: "https://government.example.com";
        authentication: GovernmentTokenAuth | Key;
      };
    }
    @service @azureServiceConfigurations(MixedConfigurations)
    namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  const configurations = client.clientInitialization.serviceConfigurations?.configurations;
  expect(
    configurations?.map((configuration) =>
      configuration.authentication.options.map((option) =>
        option.schemes.map((scheme) => scheme.model.name),
      ),
    ),
  ).toEqual([
    [["PublicAuth", "Key"], ["NoAuth"]],
    [["GovernmentTokenAuth"], ["Key"]],
  ]);
  expect(
    configurations?.map((configuration) =>
      configuration.credential?.type.kind === "union"
        ? configuration.credential.type.variantTypes.map((type) =>
            type.kind === "credential" ? type.scheme.model.name : type.kind,
          )
        : [],
    ),
  ).toEqual([
    ["PublicAuth", "Key", "NoAuth"],
    ["GovernmentTokenAuth", "Key"],
  ]);
});

it("rejects incompatible pairings even when flat HTTP servers and auth alternatives agree", async () => {
  const { program } = await AzureCoreTester.compile(`
        model AuthA is AadOauth2Auth<["a.read"]>;
        model AuthB is AadOauth2Auth<["b.read"]>;
        model AuthC is AadOauth2Auth<["c.read"]>;
        model FirstConfigurations {
          public: { endpoint: "https://public.example.com"; authentication: AuthA | AuthB };
          government: { endpoint: "https://government.example.com"; authentication: AuthA | AuthC };
          china: { endpoint: "https://china.example.com"; authentication: AuthB | AuthC };
        }
        model SecondConfigurations {
          public: { endpoint: "https://public.example.com"; authentication: AuthA | AuthB };
          government: { endpoint: "https://government.example.com"; authentication: AuthB | AuthC };
          china: { endpoint: "https://china.example.com"; authentication: AuthA | AuthC };
        }
        @service @azureServiceConfigurations(FirstConfigurations)
        namespace First { @get @route("/first") op first(): void; }
        @service @azureServiceConfigurations(SecondConfigurations)
        namespace Second { @get @route("/second") op second(): void; }
        @client({service: [First, Second], autoMergeService: true})
        namespace Combined {}
      `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  expectDiagnostics(program.diagnostics, [
    { code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" },
  ]);
});

it.each([false, true])(
  "compares merged server parameter defaults: conflict=%s",
  async (conflict) => {
    const { program } = await AzureCoreTester.compile(`
        ${definitions}
        model FirstConfigurations {
          public: { endpoint: "{endpoint}"; parameters: { endpoint: url = "https://first.example.com" }; authentication: PublicAuth };
        }
        model SecondConfigurations {
          public: { endpoint: "{endpoint}"; parameters: { endpoint: url = "https://${conflict ? "second" : "first"}.example.com" }; authentication: PublicAuth };
        }
        @service @azureServiceConfigurations(FirstConfigurations)
        namespace First { @get @route("/first") op first(): void; }
        @service @azureServiceConfigurations(SecondConfigurations)
        namespace Second { @get @route("/second") op second(): void; }
        @client({service: [First, Second], autoMergeService: true})
        namespace Combined {}
      `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    expectDiagnostics(
      program.diagnostics,
      conflict
        ? [{ code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" }]
        : [],
    );
  },
);

it.each([
  { version: "1", level: "root" },
  { version: "2", level: "root" },
  { version: "1", level: "child" },
])(
  "validates merged $level catalogs after API-version projection for version $version",
  async ({ version, level }) => {
    const { program } = await AzureCoreTester.compile(`
      model PublicAuth is AadOauth2Auth<["public.read"]>;
      model GovernmentAuth is AadOauth2Auth<["government.read"]>;

      @versioned(AuthDefinitions.Versions)
      namespace AuthDefinitions {
        enum Versions { v1: "1", v2: "2" }
        model Configurations {
          public: { endpoint: "https://public.example.com"; authentication: PublicAuth };
          @added(Versions.v2)
          government: { endpoint: "https://government.example.com"; authentication: GovernmentAuth };
        }
      }
      model PublicConfigurations {
        public: { endpoint: "https://public.example.com"; authentication: PublicAuth };
      }

      @service @versioned(First.Versions)
      @azureServiceConfigurations(${level === "child" ? "PublicConfigurations" : "AuthDefinitions.Configurations"})
      namespace First {
        enum Versions {
          @useDependency(AuthDefinitions.Versions.v1) v1: "1",
          @useDependency(AuthDefinitions.Versions.v2) v2: "2",
        }
        ${level === "child" ? "@azureServiceConfigurations(AuthDefinitions.Configurations) namespace Operations {" : ""}
        @get @route("/first") op first(): void;
        ${level === "child" ? "}" : ""}
      }

      @service @versioned(Second.Versions)
      @azureServiceConfigurations(PublicConfigurations)
      namespace Second {
        enum Versions {
          @useDependency(AuthDefinitions.Versions.v1) v1: "1",
          @useDependency(AuthDefinitions.Versions.v2) v2: "2",
        }
        ${level === "child" ? "@azureServiceConfigurations(PublicConfigurations) namespace Operations {" : ""}
        @get @route("/second") op second(): void;
        ${level === "child" ? "}" : ""}
      }

      @client({service: [First, Second], autoMergeService: true})
      namespace Combined {}
    `);
    const rawContext = createTCGCContext(program, "@azure-tools/typespec-python", {
      mutateNamespace: false,
    });
    rawContext.getRootClients();
    expectDiagnostics(program.diagnostics, []);
    const context = await createSdkContextForTester(program, {
      "api-version": { First: version, Second: version },
    });
    expect(context.diagnostics).toEqual([]);
    expectDiagnostics(
      program.diagnostics,
      version === "1"
        ? []
        : [{ code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" }],
    );
    if (version === "1") {
      expect(context.sdkPackage.clients).toHaveLength(1);
      const root = context.sdkPackage.clients[0];
      const client = level === "child" ? root.children?.[0] : root;
      ok(client);
      expect(client.methods.map((method) => method.name)).toEqual(["first", "second"]);
      expect(client.clientInitialization.serviceConfigurations).toMatchObject({
        defaultConfiguration: "public",
        configurations: [{ name: "public", endpoint: { serverUrl: "https://public.example.com" } }],
      });
    }
  },
);

it.each(["1", "2"])(
  "projects version-specific configuration entries for version %s",
  async (version) => {
    const { program } = await AzureCoreTester.compile(`
        @versioned(AuthDefinitions.Versions)
        namespace AuthDefinitions {
          enum Versions { v1: "1", v2: "2" }
          model PublicAuth is AadOauth2Auth<["public.read"]>;
          model GovernmentAuth is AadOauth2Auth<["government.read"]>;
          model Configurations {
            public: { endpoint: "https://public.example.com"; authentication: PublicAuth };
            @added(Versions.v2)
            government: { endpoint: "https://government.example.com"; authentication: GovernmentAuth };
          }
        }
        @service @versioned(Service.Versions)
        @azureServiceConfigurations(AuthDefinitions.Configurations)
        namespace Service {
          enum Versions {
            @useDependency(AuthDefinitions.Versions.v1) v1: "1",
            @useDependency(AuthDefinitions.Versions.v2) v2: "2",
          }
          @get op read(): void;
        }
      `);
    const context = await createSdkContextForTester(program, { "api-version": version });
    expect(context.diagnostics).toEqual([]);
    const configurations =
      context.sdkPackage.clients[0].clientInitialization.serviceConfigurations?.configurations;
    expect(configurations?.map((configuration) => configuration.name)).toEqual(
      version === "1" ? ["public"] : ["public", "government"],
    );
  },
);
it("uses public authentication regardless of declaration order", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @service @azureServiceConfigurations(Configurations)
    namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(getCredential(client).type).toMatchObject({
    kind: "credential",
    scheme: { model: { name: "PublicAuth" } },
  });
  expect(client.clientInitialization.serviceConfigurations?.defaultConfiguration).toBe("public");
});

it("does not bind configurations by matching scopes", async () => {
  const { program } = await AzureCoreTester.compile(`
    model PublicAuth is AadOauth2Auth<["shared.read"], "https://public.example.com/authorize", "https://public.example.com/token">;
    model GovernmentAuth is AadOauth2Auth<["shared.read"], "https://government.example.com/authorize", "https://government.example.com/token">;
    model Configurations {
      public: { endpoint: "https://public.example.com"; authentication: PublicAuth };
      government: { endpoint: "https://government.example.com"; authentication: GovernmentAuth };
    }
    @service @azureServiceConfigurations(Configurations)
    namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const configurations =
    context.sdkPackage.clients[0].clientInitialization.serviceConfigurations?.configurations;
  expect(
    configurations?.map((configuration) => configuration.authentication.options[0].schemes[0]),
  ).toMatchObject([
    { model: { name: "PublicAuth" }, flows: [{ tokenUrl: "https://public.example.com/token" }] },
    {
      model: { name: "GovernmentAuth" },
      flows: [{ tokenUrl: "https://government.example.com/token" }],
    },
  ]);
});

it("serializes every paired configuration without compiler model references", async () => {
  const { program, fs } = await AzureCoreTester.compile(`
    ${definitions}
    @service @azureServiceConfigurations(Configurations)
    namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program, {}, { exportTCGCoutput: true });
  expect(context.diagnostics).toEqual([]);
  const output = fs.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
  ok(output);
  const catalog = parse(output).clients[0].clientInitialization.serviceConfigurations;
  expect(catalog.defaultConfiguration).toBe("public");
  expect(
    catalog.configurations.map((configuration: { name: string }) => configuration.name),
  ).toEqual(["public", "government"]);
  const government = catalog.configurations[1];
  expect(government.endpoint.serverUrl).toBe("https://api.loganalytics.us");
  expect(government.authentication.options[0].schemes[0]).not.toHaveProperty("model");
  expect(government.credential.type.scheme).not.toHaveProperty("model");
  expect(government.credential.type.scheme.flows[0]).toMatchObject({
    tokenUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/token",
    scopes: [{ value: "https://api.loganalytics.us/.default" }],
  });
});

it("includes endpoint parameter types reachable only from a non-default configuration", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    enum Region { East: "east", West: "west" }
    model RegionalConfigurations {
      public: { endpoint: "https://public.example.com"; authentication: PublicAuth };
      government: {
        endpoint: "https://{region}.government.example.com";
        parameters: { region: Region };
        authentication: GovernmentAuth;
      };
    }
    @service @azureServiceConfigurations(RegionalConfigurations)
    namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const configuration =
    context.sdkPackage.clients[0].clientInitialization.serviceConfigurations?.configurations[1];
  const region = configuration?.endpoint.templateArguments[0].type;
  ok(region?.kind === "enum");
  expect(region.usage & UsageFlags.Input).toBeTruthy();
  expect(context.sdkPackage.enums).toContain(region);
});

it.each(["child", "grandchild"])(
  "includes endpoint enums referenced only by a %s catalog",
  async (level) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      enum Region { East: "east", West: "west" }
      model LocalConfigurations {
        public: { endpoint: "https://local.example.com"; authentication: PublicAuth };
        government: {
          endpoint: "https://{region}.government.example.com";
          parameters: { region: Region };
          authentication: GovernmentAuth;
        };
      }
      @service @azureServiceConfigurations(Configurations)
      namespace Service {
        ${level === "child" ? "@azureServiceConfigurations(LocalConfigurations)" : ""}
        namespace Operations {
          ${level === "grandchild" ? "@azureServiceConfigurations(LocalConfigurations)" : ""}
          namespace Nested { @get op read(): void; }
        }
      }
    `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    const child = context.sdkPackage.clients[0].children?.[0];
    const client = level === "child" ? child : child?.children?.[0];
    const configuration = client?.clientInitialization.serviceConfigurations?.configurations[1];
    const region = configuration?.endpoint.templateArguments[0].type;
    ok(region?.kind === "enum");
    expect(region.usage & UsageFlags.Input).toBeTruthy();
    expect(context.sdkPackage.enums).toContain(region);
  },
);
