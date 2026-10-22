import { Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { getAuthentication, getServers } from "@typespec/http";
import { describe, expect, it } from "vitest";

const authentication = `
  model PublicAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;
  model GovernmentAuth is AadOauth2Auth<
    ["https://api.loganalytics.us/.default"],
    "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.us/common/oauth2/v2.0/token"
  >;
`;

describe("Azure service configurations", () => {
  it("projects default-first servers and one OR authentication requirement", async () => {
    const { program, Service } = await Tester.compile(t.code`
      ${authentication}
      model Configurations {
        Government: {
          endpoint: "https://api.loganalytics.us";
          authentication: GovernmentAuth;
        };
        Public: {
          endpoint: "https://api.loganalytics.io";
          authentication: PublicAuth;
        };
      }
      @azureServiceConfigurations(Configurations, "Public")
      namespace ${t.namespace("Service")} {}
    `);
    expect(getServers(program, Service)?.map((server) => server.url)).toEqual([
      "https://api.loganalytics.io",
      "https://api.loganalytics.us",
    ]);
    const auth = getAuthentication(program, Service);
    expect(
      auth?.options.map((option) => option.schemes.map((scheme) => scheme.model.name)),
    ).toEqual([["PublicAuth"], ["GovernmentAuth"]]);
    const government = auth?.options[1].schemes[0];
    if (government?.type !== "oauth2") throw new Error("Missing Government OAuth configuration");
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
      union PublicRequirements { [PublicAuth, Key], NoAuth }
      model Configurations {
        Public: {
          endpoint: "https://public.example.com";
          authentication: PublicRequirements;
        };
        Government: {
          endpoint: "https://government.example.com";
          authentication: [GovernmentAuth, Key] | NoAuth;
        };
      }
      @azureServiceConfigurations(Configurations, "Public")
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
        Public: {
          endpoint: "https://{account}.example.com";
          parameters: { account: string = "default-account" };
          authentication: PublicAuth;
        };
      }
      @azureServiceConfigurations(Configurations, "Public")
      namespace ${t.namespace("Service")} {}
    `);
    const server = getServers(program, Service)?.[0];
    expect(server?.url).toBe("https://{account}.example.com");
    expect(server?.parameters.get("account")).toMatchObject({
      type: { kind: "Scalar", name: "string" },
      defaultValue: { value: "default-account" },
    });
  });

  it("does not require Entra audience annotations for ordinary OAuth scopes", async () => {
    const { program, Service } = await Tester.compile(t.code`
      model Auth is AadOauth2Auth<["read", "write"]>;
      model Configurations {
        Public: { endpoint: "{endpoint}"; parameters: { endpoint: url }; authentication: Auth };
      }
      @azureServiceConfigurations(Configurations, "Public")
      namespace ${t.namespace("Service")} {}
    `);
    const scheme = getAuthentication(program, Service)?.options[0].schemes[0];
    if (scheme?.type !== "oauth2") throw new Error("Missing OAuth configuration");
    expect(scheme.flows[0].scopes.map((scope) => scope.value)).toEqual(["read", "write"]);
  });

  it.each([
    {
      name: "an empty catalog",
      configurations: "model Configurations {}",
      defaultName: "Public",
      message: "At least one service configuration is required.",
    },
    {
      name: "a missing default",
      configurations: `
        model Configurations {
          Public: { endpoint: "https://example.com"; authentication: PublicAuth };
        }`,
      defaultName: "Missing",
      message: "The default configuration 'Missing' is not declared.",
    },
    {
      name: "a nonliteral endpoint",
      configurations: `
        model Configurations {
          Public: { endpoint: string; authentication: PublicAuth };
        }`,
      defaultName: "Public",
      message: "Configuration 'Public' must declare a non-empty endpoint string literal.",
    },
    {
      name: "an unknown configuration property",
      configurations: `
        model Configurations {
          Public: { endpoint: "https://example.com"; authentication: PublicAuth; descripton: "typo" };
        }`,
      defaultName: "Public",
      message: "Unknown service configuration property 'descripton'.",
    },
    {
      name: "a configuration without OAuth",
      configurations: `
        model Configurations {
          Public: {
            endpoint: "https://example.com";
            authentication: ApiKeyAuth<ApiKeyLocation.header, "api-key">;
          };
        }`,
      defaultName: "Public",
      message: "Service configurations must include an OAuth2 authentication scheme.",
    },
    {
      name: "different authentication mechanisms",
      configurations: `
        model Configurations {
          Public: {
            endpoint: "https://public.example.com";
            authentication: PublicAuth | ApiKeyAuth<ApiKeyLocation.header, "api-key">;
          };
          Government: { endpoint: "https://government.example.com"; authentication: GovernmentAuth };
        }`,
      defaultName: "Public",
      message:
        "Service configurations must have the same authentication requirements except for OAuth URLs and scopes.",
    },
  ])("rejects $name", async ({ configurations, defaultName, message }) => {
    expectDiagnostics(
      await Tester.diagnose(`
        ${authentication}
        ${configurations}
        @azureServiceConfigurations(Configurations, "${defaultName}")
        namespace Service {}
      `),
      { code: "@azure-tools/typespec-azure-core/azure-authentication-invalid", message },
    );
  });

  it.each(["@useAuth(PublicAuth)", '@server("https://other.example.com")'])(
    "rejects a conflicting direct declaration in either order: %s",
    async (decorator) => {
      for (const directFirst of [false, true]) {
        const pairing = '@azureServiceConfigurations(Configurations, "Public")';
        expectDiagnostics(
          await Tester.diagnose(`
            ${authentication}
            model Configurations {
              Public: { endpoint: "https://example.com"; authentication: PublicAuth };
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
          Public: { endpoint: "https://{account}.example.com"; authentication: PublicAuth };
        }
        @azureServiceConfigurations(Configurations, "Public")
        namespace Service {}
      `),
      { code: "@typespec/http/missing-server-param" },
    );
  });
});
