import { Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { getAuthentication, getServers } from "@typespec/http";
import { ok } from "assert";
import { describe, expect, it } from "vitest";
import { getAzureServiceConfigurations } from "./azure-service-configurations.js";

const authentication = `
  model PublicAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;
  model GovernmentAuth is AadOauth2Auth<
    ["https://api.loganalytics.us/.default"],
    "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.us/common/oauth2/v2.0/token"
  >;
`;

describe("Azure service configurations", () => {
  it("accepts value catalogs and preserves the referenced authentication models", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      const Configurations: Record<AzureServiceConfiguration> = #{
        government: #{
          endpoint: "https://api.loganalytics.us",
          authentication: typeref(GovernmentAuth),
        },
        public: #{
          endpoint: "https://api.loganalytics.io",
          authentication: typeref(PublicAuth),
        },
      };
      @azureServiceConfigurations(Configurations)
      namespace ${t.namespace("Service")} {}
    `);
    const configurations = getAzureServiceConfigurations(program, Service)?.configurations;
    expect(configurations?.map((configuration) => configuration.name)).toEqual([
      "public",
      "government",
    ]);
    expect(configurations?.[0].authentication.options[0].schemes[0].model).toBe(
      program.getGlobalNamespaceType().models.get("PublicAuth"),
    );
    expect(configurations?.[1].authentication.options[0].schemes[0].model).toBe(
      program.getGlobalNamespaceType().models.get("GovernmentAuth"),
    );
  });

  it("passes referenced endpoint parameter models and their defaults to HTTP", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      model Parameters { account: string = "default-account"; }
      @azureServiceConfigurations(#{
        public: #{
          endpoint: "https://{account}.example.com",
          authentication: typeref(PublicAuth),
          parameters: typeref(Parameters),
        },
      })
      namespace ${t.namespace("Service")} {}
    `);
    expect(getServers(program, Service)?.[0].parameters.get("account")).toMatchObject({
      type: { kind: "Scalar", name: "string" },
      defaultValue: { value: "default-account" },
    });
  });

  it("rejects the replaced model-based catalog form", async () => {
    const diagnostics = await Tester.diagnose(`
      ${authentication}
      model Configurations {
        public: { endpoint: "https://example.com"; authentication: PublicAuth; };
      }
      @azureServiceConfigurations(Configurations)
      namespace Service {}
    `);
    expectDiagnostics(diagnostics, { code: "invalid-argument" });
  });

  it("uses public as the default regardless of declaration order", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      const Configurations = #{
        government: #{
          endpoint: "https://api.loganalytics.us",
          authentication: typeref(GovernmentAuth),
        },
        public: #{
          endpoint: "https://api.loganalytics.io",
          authentication: typeref(PublicAuth),
        },
      };
      @azureServiceConfigurations(Configurations)
      namespace ${t.namespace("Service")} {}
    `);
    expect(getServers(program, Service)?.map((server) => server.url)).toEqual([
      "https://api.loganalytics.io",
      "https://api.loganalytics.us",
    ]);
    expect(getAzureServiceConfigurations(program, Service)).toMatchObject({
      defaultConfiguration: "public",
      configurations: [{ name: "public" }, { name: "government" }],
    });
    const auth = getAuthentication(program, Service);
    expect(
      auth?.options.map((option) => option.schemes.map((scheme) => scheme.model.name)),
    ).toEqual([["PublicAuth"], ["GovernmentAuth"]]);
    const government = auth?.options[1].schemes[0];
    ok(government?.type === "oauth2");
    expect(government.flows[0]).toMatchObject({
      authorizationUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.us/common/oauth2/v2.0/token",
      scopes: [{ value: "https://api.loganalytics.us/.default" }],
    });
  });

  it("flattens OR alternatives, preserves AND groups, and deduplicates common requirements", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
      const Configurations = #{
        public: #{
          endpoint: "https://public.example.com",
          authentication: typeref([PublicAuth, Key] | NoAuth),
        },
        government: #{
          endpoint: "https://government.example.com",
          authentication: typeref([GovernmentAuth, Key] | NoAuth),
        },
      };
      @azureServiceConfigurations(Configurations)
      namespace ${t.namespace("Service")} {}
    `);
    expect(
      getAuthentication(program, Service)?.options.map((option) =>
        option.schemes.map((scheme) => scheme.model.name),
      ),
    ).toEqual([["PublicAuth", "Key"], ["NoAuth"], ["GovernmentAuth", "Key"]]);
  });

  it("passes template parameter types and defaults to the HTTP server decorator", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      const Configurations = #{
        public: #{
          endpoint: "https://{account}.example.com",
          parameters: typeref({ account: string = "default-account" }),
          authentication: typeref(PublicAuth),
        },
      };
      @azureServiceConfigurations(Configurations)
      namespace ${t.namespace("Service")} {}
    `);
    const server = getServers(program, Service)?.[0];
    expect(server?.url).toBe("https://{account}.example.com");
    expect(server?.parameters.get("account")).toMatchObject({
      type: { kind: "Scalar", name: "string" },
      defaultValue: { value: "default-account" },
    });
  });

  it("preserves different OAuth flows and authentication requirements per configuration", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      model Key is ApiKeyAuth<ApiKeyLocation.header, "api-key">;
      model GovernmentTokenAuth is OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://government.example.com/token";
        scopes: ["government.read"];
      }]>;
      const Configurations = #{
        public: #{
          endpoint: "https://public.example.com",
          authentication: typeref(PublicAuth | Key),
        },
        government: #{
          endpoint: "https://government.example.com",
          authentication: typeref([GovernmentTokenAuth, Key]),
        },
      };
      @azureServiceConfigurations(Configurations)
      namespace ${t.namespace("Service")} {}
    `);
    const catalog = getAzureServiceConfigurations(program, Service);
    expect(
      catalog?.configurations.map((configuration) =>
        configuration.authentication.options.map((option) =>
          option.schemes.map((scheme) => scheme.model.name),
        ),
      ),
    ).toEqual([[["PublicAuth"], ["Key"]], [["GovernmentTokenAuth", "Key"]]]);
    expect(
      getAuthentication(program, Service)?.options.map((option) =>
        option.schemes.map((scheme) => scheme.model.name),
      ),
    ).toEqual([["PublicAuth"], ["Key"], ["GovernmentTokenAuth", "Key"]]);
  });

  it("preserves ordinary OAuth scopes", async () => {
    const { program, Service } = await Tester.compile(t.code`
      model Auth is AadOauth2Auth<["read", "write"]>;
      const Configurations = #{
        public: #{ endpoint: "{endpoint}", parameters: typeref({ endpoint: url }), authentication: typeref(Auth) },
      };
      @azureServiceConfigurations(Configurations)
      namespace ${t.namespace("Service")} {}
    `);
    const scheme = getAuthentication(program, Service)?.options[0].schemes[0];
    ok(scheme?.type === "oauth2");
    expect(scheme.flows[0].scopes.map((scope) => scope.value)).toEqual(["read", "write"]);
  });

  it.each([
    {
      name: "an empty catalog",
      configurations: "const Configurations = #{};",
      message: "Service configurations must declare a 'public' configuration.",
    },
    {
      name: "a catalog without public",
      configurations: `
        const Configurations = #{
          government: #{ endpoint: "https://example.com", authentication: typeref(GovernmentAuth) },
        };`,
      message: "Service configurations must declare a 'public' configuration.",
    },
    {
      name: "a capitalized Public configuration",
      configurations: `
        const Configurations = #{
          Public: #{ endpoint: "https://example.com", authentication: typeref(PublicAuth) },
        };`,
      message: "Service configurations must declare a 'public' configuration.",
    },
    {
      name: "an empty endpoint",
      configurations: `
        const Configurations = #{
          public: #{ endpoint: " ", authentication: typeref(PublicAuth) },
        };`,
      message: "Configuration 'public' must declare a non-empty endpoint string.",
    },
    {
      name: "a blank configuration name",
      configurations: `
        const Configurations = #{
          public: #{ endpoint: "https://example.com", authentication: typeref(PublicAuth) },
          \` \`: #{ endpoint: "https://example.com", authentication: typeref(PublicAuth) },
        };`,
      message: "Each service configuration must have a non-empty name.",
    },
    {
      name: "a configuration without OAuth",
      configurations: `
        const Configurations = #{
          public: #{
            endpoint: "https://example.com",
            authentication: typeref(ApiKeyAuth<ApiKeyLocation.header, "api-key">),
          },
        };`,
      message: "Service configurations must include an OAuth2 authentication scheme.",
    },
  ])("rejects $name", async ({ configurations, message }) => {
    expectDiagnostics(
      await Tester.diagnose(`
        ${authentication}
        ${configurations}
        @azureServiceConfigurations(Configurations)
        namespace Service {}
      `),
      { code: "@azure-tools/typespec-azure-core/azure-authentication-invalid", message },
    );
  });

  it.each([
    {
      name: "an unknown configuration property",
      configuration:
        '#{ endpoint: "https://example.com", authentication: typeref(PublicAuth), descripton: "typo" }',
    },
    {
      name: "missing authentication",
      configuration: '#{ endpoint: "https://example.com" }',
    },
    {
      name: "a scalar authentication reference",
      configuration: '#{ endpoint: "https://example.com", authentication: typeref(string) }',
    },
    {
      name: "an authentication union containing a scalar",
      configuration:
        '#{ endpoint: "https://example.com", authentication: typeref(PublicAuth | string) }',
    },
    {
      name: "an authentication tuple containing a scalar",
      configuration:
        '#{ endpoint: "https://example.com", authentication: typeref([PublicAuth, string]) }',
    },
    {
      name: "a reference to non-model endpoint parameters",
      configuration:
        '#{ endpoint: "https://example.com", authentication: typeref(PublicAuth), parameters: typeref(string) }',
    },
  ])("uses value type validation for $name", async ({ configuration }) => {
    expectDiagnostics(
      await Tester.diagnose(`
        ${authentication}
        @azureServiceConfigurations(#{ public: ${configuration} })
        namespace Service {}
      `),
      { code: "invalid-argument" },
    );
  });

  it.each(["@useAuth(PublicAuth)", '@server("https://other.example.com")'])(
    "rejects a conflicting direct declaration in either order: %s",
    async (decorator) => {
      for (const directFirst of [false, true]) {
        const pairing = "@azureServiceConfigurations(Configurations)";
        expectDiagnostics(
          await Tester.diagnose(`
            ${authentication}
            const Configurations = #{
              public: #{ endpoint: "https://example.com", authentication: typeref(PublicAuth) },
            };
            ${directFirst ? decorator : pairing}
            ${directFirst ? pairing : decorator}
            namespace Service {}
          `),
          {
            code: "@azure-tools/typespec-azure-core/azure-authentication-invalid",
            message:
              "Do not combine @azureServiceConfigurations with @server or @useAuth on the same namespace.",
          },
        );
      }
    },
  );

  it("uses the HTTP diagnostic for undeclared server parameters", async () => {
    expectDiagnostics(
      await Tester.diagnose(`
        ${authentication}
        const Configurations = #{
          public: #{ endpoint: "https://{account}.example.com", authentication: typeref(PublicAuth) },
        };
        @azureServiceConfigurations(Configurations)
        namespace Service {}
      `),
      { code: "@typespec/http/missing-server-param" },
    );
  });
});
