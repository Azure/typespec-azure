import { getAzureServiceConfigurations } from "@azure-tools/typespec-azure-core";
import { expectDiagnostics, resolveVirtualPath } from "@typespec/compiler/testing";
import { getAuthentication, getHttpOperation, getServers } from "@typespec/http";
import { ok } from "assert";
import { expect, it } from "vitest";
import { parse } from "yaml";
import { type SdkClientType, UsageFlags } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const definitions = `
  model PublicAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;
  model GovernmentAuth is AadOauth2Auth<
    ["https://api.loganalytics.us/.default"],
    "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.us/common/oauth2/v2.0/token"
  >;
  const Configurations = #{
    government: #{ endpoint: "https://api.loganalytics.us", authentication: typeref(GovernmentAuth) },
    public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(PublicAuth) },
  };
`;

function getCredential(client: SdkClientType) {
  const credential = client.clientInitialization.parameters.find(
    (parameter) => parameter.kind === "credential",
  );
  ok(credential);
  return credential;
}

it.each(["python", "csharp", "java", "go", "ts"])(
  "projects paired configurations without changing HTTP initialization for %s",
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
    ok(credential.type.kind === "union");
    expect(credential.type.variantTypes.map((type) => type.scheme.model.name)).toEqual([
      "PublicAuth",
      "GovernmentAuth",
    ]);
    const endpoint = client.clientInitialization.parameters.find(
      (parameter) => parameter.kind === "endpoint",
    );
    ok(endpoint?.type.kind === "union");
    expect(
      endpoint.type.variantTypes.map((type) => type.templateArguments[0].clientDefaultValue),
    ).toEqual(["https://api.loganalytics.io", "https://api.loganalytics.us"]);
    const service = client.__raw.services[0];
    expect(client.authentication).toBe(getAuthentication(program, service));
    expect(client.authentication?.options).toHaveLength(2);
    const rawCatalog = getAzureServiceConfigurations(program, service);
    const defaultConfiguration = rawCatalog?.configurations.find(
      (configuration) => configuration.name === rawCatalog.defaultConfiguration,
    );
    ok(defaultConfiguration);
    expect(getServers(program, service)?.[0]).toBe(defaultConfiguration.server);
  },
);

it("keeps a versioned service's catalog aligned with its HTTP metadata", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @service @versioned(Versions) @azureServiceConfigurations(Configurations)
    namespace Service {
      enum Versions { v1: "2025-01-01", v2: "2026-01-01" }
      @get op read(): void;
    }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(
    client.clientInitialization.serviceConfigurations?.configurations.map(
      (configuration) => configuration.endpoint.serverUrl,
    ),
  ).toEqual(["https://api.loganalytics.io", "https://api.loganalytics.us"]);
  expect(client.authentication).toBe(getAuthentication(program, client.__raw.services[0]));
});

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
        const SearchConfigurations = #{
          public: #{ endpoint: "{endpoint}", parameters: typeref({ endpoint: url }), authentication: typeref(PublicAuth | Key) },
          government: #{ endpoint: "{endpoint}", parameters: typeref({ endpoint: url }), authentication: typeref(GovernmentAuth | Key) },
        };
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
  const credential = getCredential(client);
  ok(credential.type.kind === "union");
  expect(credential.type.variantTypes.map((type) => type.scheme.model.name)).toEqual([
    "PublicAuth",
    "Key",
    "GovernmentAuth",
  ]);
});

it("keeps OR-of-AND requirements local to each configuration", async () => {
  const { program } = await AzureCoreTester.compile(`
        ${definitions}
        model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
        const CombinedConfigurations = #{
          public: #{ endpoint: "https://public.example.com", authentication: typeref([PublicAuth, Key] | NoAuth) },
          government: #{ endpoint: "https://government.example.com", authentication: typeref([GovernmentAuth, Key] | NoAuth) },
        };
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
  "keeps the service's catalog despite SDK-parent overrides for %s children",
  async (kind) => {
    const { program } = await AzureCoreTester.compile(`
          ${definitions}
          @service @azureServiceConfigurations(Configurations)
          namespace Service {
            interface Operations { @get @route("/child") read(): void; }
          }
          const PrivateConfigurations = #{
            public: #{ endpoint: "https://private.example.com", authentication: typeref(PublicAuth) },
          };
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
    for (const current of [client, child]) {
      expect(
        current.clientInitialization.serviceConfigurations?.configurations.map(
          (configuration) => configuration.endpoint.serverUrl,
        ),
      ).toEqual(["https://api.loganalytics.io", "https://api.loganalytics.us"]);
      expect(current.__raw.services[0]).toBe(client.__raw.services[0]);
      expect(current.authentication).toBe(getAuthentication(program, client.__raw.services[0]));
    }
    expect(child.clientInitialization.serviceConfigurations).not.toBe(
      client.clientInitialization.serviceConfigurations,
    );
  },
);

it("does not apply an enclosing namespace's catalog to a service without its own servers", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @azureServiceConfigurations(Configurations)
    namespace Parent {
      @service namespace Service { @get op read(): void; }
    }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(client.clientInitialization).not.toHaveProperty("serviceConfigurations");
  expect(client.authentication).toBeUndefined();
  const endpoint = client.clientInitialization.parameters.find(
    (parameter) => parameter.kind === "endpoint",
  );
  ok(endpoint?.type.kind === "endpoint");
  expect(endpoint.type.templateArguments[0].clientDefaultValue).toBeUndefined();
});

it("keeps the service's catalog on merged children and grandchildren", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    const LocalConfigurations = #{
      public: #{ endpoint: "https://local.example.com", authentication: typeref(GovernmentAuth) },
    };
    const NestedConfigurations = #{
      public: #{ endpoint: "https://nested.example.com", authentication: typeref(GovernmentAuth) },
    };
    const PrivateConfigurations = #{
      public: #{ endpoint: "https://private.example.com", authentication: typeref(PublicAuth) },
    };
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
  ok(child && grandchild);
  for (const client of [root, child, grandchild]) {
    expect(
      client.clientInitialization.serviceConfigurations?.configurations.map(
        (configuration) => configuration.endpoint.serverUrl,
      ),
    ).toEqual(["https://api.loganalytics.io", "https://api.loganalytics.us"]);
    expect(client.__raw.services[0]).toBe(root.__raw.services[0]);
    const credential = getCredential(client);
    ok(credential.type.kind === "union");
    expect(credential.type.variantTypes.map((type) => type.scheme.model.name)).toEqual([
      "PublicAuth",
      "GovernmentAuth",
    ]);
  }
  expect(grandchild.methods.map((method) => method.name)).toEqual(["first", "second"]);
});

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
  "uses only the first service's catalog with services ordered %s",
  async (services) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      const SingleConfiguration = #{
        public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(PublicAuth) },
      };
      @service @server("https://api.loganalytics.io")
      namespace WithoutConfigurations { @get @route("/first") op first(): void; }
      @service @azureServiceConfigurations(SingleConfiguration)
      namespace Configured { @get @route("/second") op second(): void; }
      @client({service: [${services}], autoMergeService: true})
      namespace Combined {}
    `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    expectDiagnostics(program.diagnostics, []);
    const client = context.sdkPackage.clients[0];
    const catalog = client.clientInitialization.serviceConfigurations;
    if (services.startsWith("Configured")) {
      expect(catalog?.configurations[0].name).toBe("public");
      expect(getCredential(client).type).toMatchObject({
        kind: "credential",
        scheme: { model: { name: "PublicAuth" } },
      });
    } else {
      expect(catalog).toBeUndefined();
      expect(client.authentication).toBeUndefined();
      expect(
        client.clientInitialization.parameters.some((parameter) => parameter.kind === "credential"),
      ).toBe(false);
    }
    expect(client.methods.map((method) => method.name)).toEqual(
      services.startsWith("Configured") ? ["second", "first"] : ["first", "second"],
    );
  },
);

it.each(["First, Second", "Second, First"])(
  "selects endpoint parameters and authentication from the first service: %s",
  async (services) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      const FirstConfigurations = #{
        public: #{
          endpoint: "{endpoint}",
          parameters: typeref({ endpoint: url = "https://first.example.com" }),
          authentication: typeref(PublicAuth),
        },
      };
      const SecondConfigurations = #{
        public: #{
          endpoint: "https://second.example.com",
          authentication: typeref(GovernmentAuth),
        },
        government: #{
          endpoint: "https://government.example.com",
          authentication: typeref(GovernmentAuth),
        },
      };
      @service @azureServiceConfigurations(FirstConfigurations)
      namespace First { @get @route("/first") op first(): void; }
      @service @azureServiceConfigurations(SecondConfigurations)
      namespace Second { @get @route("/second") op second(): void; }
      @client({service: [${services}], autoMergeService: true})
      namespace Combined {}
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(program.diagnostics, []);
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    const first = services.startsWith("First");
    const catalog = client.clientInitialization.serviceConfigurations;
    expect(catalog?.configurations.map((configuration) => configuration.name)).toEqual(
      first ? ["public"] : ["public", "government"],
    );
    const endpoint = client.clientInitialization.parameters.find(
      (parameter) => parameter.kind === "endpoint",
    );
    ok(endpoint);
    const endpoints = endpoint.type.kind === "union" ? endpoint.type.variantTypes : [endpoint.type];
    expect(endpoints.map((type) => type.templateArguments[0].clientDefaultValue)).toEqual(
      first
        ? ["https://first.example.com"]
        : ["https://second.example.com", "https://government.example.com"],
    );
    const expectedAuth = {
      model: { name: first ? "PublicAuth" : "GovernmentAuth" },
      flows: [
        {
          scopes: [
            {
              value: first
                ? "https://api.loganalytics.io/.default"
                : "https://api.loganalytics.us/.default",
            },
          ],
        },
      ],
    };
    expect(client.authentication?.options[0].schemes[0]).toMatchObject(expectedAuth);
    expect(getCredential(client).type).toMatchObject({
      kind: "credential",
      scheme: expectedAuth,
    });
    expect(client.methods.map((method) => method.name)).toEqual(
      first ? ["first", "second"] : ["second", "first"],
    );
  },
);

it("projects configuration-specific authentication and credential alternatives", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
    model GovernmentTokenAuth is OAuth2Auth<[{
      type: OAuth2FlowType.clientCredentials;
      tokenUrl: "https://government.example.com/token";
      scopes: ["government.read"];
    }]>;
    const MixedConfigurations = #{
      public: #{
        endpoint: "https://public.example.com",
        authentication: typeref([PublicAuth, Key] | NoAuth),
      },
      government: #{
        endpoint: "https://government.example.com",
        authentication: typeref(GovernmentTokenAuth | Key),
      },
    };
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

it("does not bind configurations by matching scopes", async () => {
  const { program } = await AzureCoreTester.compile(`
    model PublicAuth is AadOauth2Auth<["shared.read"], "https://public.example.com/authorize", "https://public.example.com/token">;
    model GovernmentAuth is AadOauth2Auth<["shared.read"], "https://government.example.com/authorize", "https://government.example.com/token">;
    const Configurations = #{
      public: #{ endpoint: "https://public.example.com", authentication: typeref(PublicAuth) },
      government: #{ endpoint: "https://government.example.com", authentication: typeref(GovernmentAuth) },
    };
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
    const RegionalConfigurations = #{
      public: #{ endpoint: "https://public.example.com", authentication: typeref(PublicAuth) },
      government: #{
        endpoint: "https://{region}.government.example.com",
        parameters: typeref({ region: Region }),
        authentication: typeref(GovernmentAuth),
      },
    };
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

it("includes non-default endpoint enums from a child's own service", async () => {
  const { program } = await AzureCoreTester.compile(`
      ${definitions}
      enum Region { East: "east", West: "west" }
      const RegionalConfigurations = #{
        public: #{ endpoint: "https://local.example.com", authentication: typeref(PublicAuth) },
        government: #{
          endpoint: "https://{region}.government.example.com",
          parameters: typeref({ region: Region }),
          authentication: typeref(GovernmentAuth),
        },
      };
      @service @azureServiceConfigurations(Configurations)
      namespace First { @get @route("/first") op first(): void; }
      @service @azureServiceConfigurations(RegionalConfigurations)
      namespace Second {
        namespace Operations {
          @get @route("/second") op second(): void;
        }
      }
      @client({service: [First, Second], autoMergeService: true})
      namespace Combined {}
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const root = context.sdkPackage.clients[0];
  const child = root.children?.[0];
  expect(root.__raw.services[0].name).toBe("First");
  expect(child?.__raw.services[0].name).toBe("Second");
  expect(
    root.clientInitialization.serviceConfigurations?.configurations[1].endpoint.serverUrl,
  ).toBe("https://api.loganalytics.us");
  const configuration = child?.clientInitialization.serviceConfigurations?.configurations[1];
  const region = configuration?.endpoint.templateArguments[0].type;
  ok(region?.kind === "enum");
  expect(region.usage & UsageFlags.Input).toBeTruthy();
  expect(context.sdkPackage.enums).toContain(region);
});
