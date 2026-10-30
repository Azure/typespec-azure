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
  it("uses public as the default regardless of declaration order", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      model Configurations {
        government: {
          endpoint: "https://api.loganalytics.us";
          authentication: GovernmentAuth;
        };
        public: {
          endpoint: "https://api.loganalytics.io";
          authentication: PublicAuth;
        };
      }
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
      model Configurations {
        public: {
          endpoint: "https://public.example.com";
          authentication: [PublicAuth, Key] | NoAuth;
        };
        government: {
          endpoint: "https://government.example.com";
          authentication: [GovernmentAuth, Key] | NoAuth;
        };
      }
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
      model Configurations {
        public: {
          endpoint: "https://{account}.example.com";
          parameters: { account: string = "default-account" };
          authentication: PublicAuth;
        };
      }
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
      model Configurations {
        public: {
          endpoint: "https://public.example.com";
          authentication: PublicAuth | Key;
        };
        government: {
          endpoint: "https://government.example.com";
          authentication: [GovernmentTokenAuth, Key];
        };
      }
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
      model Configurations {
        public: { endpoint: "{endpoint}"; parameters: { endpoint: url }; authentication: Auth };
      }
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
      configurations: "model Configurations {}",
      message: "Service configurations must declare a 'public' configuration.",
    },
    {
      name: "a catalog without public",
      configurations: `
        model Configurations {
          government: { endpoint: "https://example.com"; authentication: GovernmentAuth };
        }`,
      message: "Service configurations must declare a 'public' configuration.",
    },
    {
      name: "a capitalized Public configuration",
      configurations: `
        model Configurations {
          Public: { endpoint: "https://example.com"; authentication: PublicAuth };
        }`,
      message: "Service configurations must declare a 'public' configuration.",
    },
    {
      name: "a nonliteral endpoint",
      configurations: `
        model Configurations {
          public: { endpoint: string; authentication: PublicAuth };
        }`,
      message: "Configuration 'public' must declare a non-empty endpoint string literal.",
    },
    {
      name: "an unknown configuration property",
      configurations: `
        model Configurations {
          public: { endpoint: "https://example.com"; authentication: PublicAuth; descripton: "typo" };
        }`,
      message: "Unknown service configuration property 'descripton'.",
    },
    {
      name: "a configuration without OAuth",
      configurations: `
        model Configurations {
          public: {
            endpoint: "https://example.com";
            authentication: ApiKeyAuth<ApiKeyLocation.header, "api-key">;
          };
        }`,
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

  it.each(["@useAuth(PublicAuth)", '@server("https://other.example.com")'])(
    "rejects a conflicting direct declaration in either order: %s",
    async (decorator) => {
      for (const directFirst of [false, true]) {
        const pairing = "@azureServiceConfigurations(Configurations)";
        expectDiagnostics(
          await Tester.diagnose(`
            ${authentication}
            model Configurations {
              public: { endpoint: "https://example.com"; authentication: PublicAuth };
            }
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
        model Configurations {
          public: { endpoint: "https://{account}.example.com"; authentication: PublicAuth };
        }
        @azureServiceConfigurations(Configurations)
        namespace Service {}
      `),
      { code: "@typespec/http/missing-server-param" },
    );
  });
});
