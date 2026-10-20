import { Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import {
  getAzureServiceEnvironments,
  getAzureTokenAuthentication,
} from "./azure-authentication.js";

const audience = `
  enum Audience {
    Government: "https://search.azure.us",
    Public: "https://search.azure.com",
  }
`;
const authentication = `
  ${audience}
  @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
  model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;
`;

describe("Azure token authentication", () => {
  it("uses a named default rather than declaration order and preserves OAuth flow defaults", async () => {
    const { program, Auth, Audience } = await Tester.compile(t.code`
      enum ${t.enum("Audience")} {
        Government: "https://search.azure.us",
        Public: "https://search.azure.com",
      }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
      model ${t.model("Auth")} is OAuth2Auth<[
        {
          type: OAuth2FlowType.implicit;
          authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize";
        },
        {
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.microsoftonline.com/common/oauth2/token";
          scopes: ["https://search.azure.com/.default"];
        }
      ], ["https://search.azure.com/.default"]>;
    `);
    expect(getAzureTokenAuthentication(program, Auth)).toEqual({
      kind: "entraDefaultScope",
      audience: {
        type: Audience,
        defaultAudienceName: "Public",
        defaultAudience: "https://search.azure.com",
        knownAudiences: {
          Government: "https://search.azure.us",
          Public: "https://search.azure.com",
        },
      },
      defaultScopes: ["https://search.azure.com/.default"],
    });
  });

  it("keeps a resource's trailing slash when deriving its scope", async () => {
    const { program, Auth } = await Tester.compile(t.code`
      enum Audience { Public: "https://monitor.azure.com/" }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
      model ${t.model("Auth")} is AadOauth2Auth<["https://monitor.azure.com//.default"]>;
    `);
    expect(getAzureTokenAuthentication(program, Auth)).toMatchObject({
      kind: "entraDefaultScope",
      audience: {
        defaultAudience: "https://monitor.azure.com/",
      },
      defaultScopes: ["https://monitor.azure.com//.default"],
    });
  });

  it("uses an enum member's name when its value is omitted", async () => {
    const { program, Auth } = await Tester.compile(t.code`
      enum Audience { Resource }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Resource})
      model ${t.model("Auth")} is AadOauth2Auth<["Resource/.default"]>;
    `);
    expect(getAzureTokenAuthentication(program, Auth)).toMatchObject({
      audience: { knownAudiences: { Resource: "Resource" } },
      defaultScopes: ["Resource/.default"],
    });
  });

  it("retains a named challenge contract without inventing an audience or fixed scopes", async () => {
    const { program, Auth } = await Tester.compile(t.code`
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.challengeBased, challengeContract: "azure.keyVaultChallenge/v1"})
      model ${t.model("Auth")} is AadOauth2Auth<[]>;
    `);
    expect(getAzureTokenAuthentication(program, Auth)).toEqual({
      kind: "challengeBased",
      challengeContract: "azure.keyVaultChallenge/v1",
    });
  });

  it("does not require metadata for ordinary explicit OAuth scopes", async () => {
    const { program, Auth } = await Tester.compile(t.code`
      model ${t.model("Auth")} is AadOauth2Auth<["read", "write"]>;
    `);
    expect(getAzureTokenAuthentication(program, Auth)).toBeUndefined();
  });

  it.each(["Public", "https://search.azure.com"])(
    "rejects a string default audience: %s",
    async (value) => {
      expectDiagnostics(
        await Tester.diagnose(`
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: "${value}"})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;
      `),
        { code: "invalid-argument" },
      );
    },
  );

  it("diagnoses an unknown default member at its reference", async () => {
    expectDiagnostics(
      await Tester.diagnose(`${audience}
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Missing})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`),
      { code: "invalid-ref" },
    );
  });

  it.each(['"entraDefaultScope"', "AzureTokenAuthenticationKind.challengeBased"])(
    "rejects an incompatible kind for an audience profile: %s",
    async (kind) => {
      expectDiagnostics(
        await Tester.diagnose(`${audience}
          @azureTokenAuthentication(#{kind: ${kind}, defaultAudience: Audience.Public})
          model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`),
        { code: "invalid-argument" },
      );
    },
  );

  it("preserves the selected member when resource values are duplicated", async () => {
    const { program, Auth } = await Tester.compile(t.code`
      enum Audience {
        Public: "https://search.azure.com",
        Alias: "https://search.azure.com",
      }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Alias})
      model ${t.model("Auth")} is AadOauth2Auth<["https://search.azure.com/.default"]>;
    `);
    expect(getAzureTokenAuthentication(program, Auth)).toMatchObject({
      audience: { defaultAudienceName: "Alias" },
    });
  });

  it.each([
    {
      name: "a numeric audience",
      code: `
        enum Audience { Public: 123 }
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`,
      message: "Audience members must be string resources.",
    },
    {
      name: "an empty resource",
      code: `
        enum Audience { Public: "" }
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`,
      message: "Audience resources must be non-empty strings without surrounding whitespace.",
    },
    {
      name: "a whitespace-padded resource",
      code: `
        enum Audience { Public: " https://search.azure.com" }
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`,
      message: "Audience resources must be non-empty strings without surrounding whitespace.",
    },
    {
      name: "a scope that trims a meaningful resource slash",
      code: `
        enum Audience { Public: "https://monitor.azure.com/" }
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is AadOauth2Auth<["https://monitor.azure.com/.default"]>;`,
      message: "Every OAuth flow must use the default scope 'https://monitor.azure.com//.default'.",
    },
    {
      name: "an explicitly empty flow overriding nonempty default scopes",
      code: `${audience}
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is OAuth2Auth<[{
          type: OAuth2FlowType.implicit;
          authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize";
          scopes: [];
        }], ["https://search.azure.com/.default"]>;`,
      message: "Every OAuth flow must use the default scope 'https://search.azure.com/.default'.",
    },
    {
      name: "different scopes in another flow",
      code: `${audience}
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is OAuth2Auth<[
          {
            type: OAuth2FlowType.implicit;
            authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize";
            scopes: ["https://search.azure.com/.default"];
          },
          {
            type: OAuth2FlowType.clientCredentials;
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/token";
            scopes: ["other.read"];
          }
        ]>;`,
      message: "Every OAuth flow must use the default scope 'https://search.azure.com/.default'.",
    },
    {
      name: "a non-OAuth model",
      code: `
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.challengeBased, challengeContract: "azure.keyVaultChallenge/v1"})
        model Auth is ApiKeyAuth<ApiKeyLocation.header, "api-key">;`,
      message: "The target must be an OAuth authentication model.",
    },
    {
      name: "an empty challenge contract",
      code: `
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.challengeBased, challengeContract: " "})
        model Auth is AadOauth2Auth<[]>;`,
      message: "A challenge profile requires a non-empty challenge contract.",
    },
  ])("rejects $name", async ({ code, message }) => {
    expectDiagnostics(await Tester.diagnose(code), {
      code: "@azure-tools/typespec-azure-core/azure-authentication-invalid",
      message,
    });
  });
});

describe("Azure service environments", () => {
  it("binds optional endpoint defaults to known audience enum members", async () => {
    const { program, Auth, Service } = await Tester.compile(t.code`
        enum Audience {
          Government: "https://government.example.com",
          Public: "https://service.example.com",
        }
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model ${t.model("Auth")} is AadOauth2Auth<["https://service.example.com/.default"]>;
        @azureServiceEnvironments(Auth, #{
          Public: #{audience: Audience.Public},
          Government: #{audience: Audience.Government, defaultEndpoint: "https://government.example.com/api"}
        }, "Public")
        namespace ${t.namespace("Service")} {}
      `);
    expect(getAzureTokenAuthentication(program, Auth)).toMatchObject({
      kind: "entraDefaultScope",
      audience: {
        defaultAudienceName: "Public",
        defaultAudience: "https://service.example.com",
      },
      defaultScopes: ["https://service.example.com/.default"],
    });
    expect(getAzureServiceEnvironments(program, Service, Auth)).toEqual({
      environments: [
        {
          name: "Public",
          audienceName: "Public",
          audience: "https://service.example.com",
        },
        {
          name: "Government",
          audienceName: "Government",
          audience: "https://government.example.com",
          defaultEndpoint: "https://government.example.com/api",
        },
      ],
      defaultEnvironment: "Public",
    });
  });

  it("inherits deployment data and allows a more specific declaration", async () => {
    const { program, Auth, Service, Operations } = await Tester.compile(t.code`
      ${audience}
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
      model ${t.model("Auth")} is AadOauth2Auth<["https://search.azure.com/.default"]>;
      @azureServiceEnvironments(Auth, #{
        Public: #{audience: Audience.Public, defaultEndpoint: "https://instance.search.windows.net"},
        Government: #{audience: Audience.Government}
      }, "Public")
      namespace ${t.namespace("Service")} {
        @azureServiceEnvironments(Auth, #{
          Private: #{audience: Audience.Public, defaultEndpoint: "https://private.example.com/base"}
        })
        interface ${t.interface("Operations")} {}
      }
    `);
    expect(getAzureServiceEnvironments(program, Service, Auth)).toEqual({
      environments: [
        {
          name: "Public",
          audienceName: "Public",
          audience: "https://search.azure.com",
          defaultEndpoint: "https://instance.search.windows.net",
        },
        {
          name: "Government",
          audienceName: "Government",
          audience: "https://search.azure.us",
        },
      ],
      defaultEnvironment: "Public",
    });
    expect(getAzureServiceEnvironments(program, Operations, Auth)).toEqual({
      environments: [
        {
          name: "Private",
          audienceName: "Public",
          audience: "https://search.azure.com",
          defaultEndpoint: "https://private.example.com/base",
        },
      ],
    });
  });

  it.each([
    {
      name: "a member from a different enum with an identical name and resource",
      options: "#{Public: #{audience: ForeignAudience.Public}}",
      defaultEnvironment: "",
      message: "Environment 'Public' must reference a member of the authentication audience enum.",
    },
    {
      name: "an undeclared default environment",
      options: "#{Public: #{audience: Audience.Public}}",
      defaultEnvironment: ', "Missing"',
      message: "The default environment 'Missing' is not declared.",
    },
    {
      name: "a default environment with a different audience",
      options: "#{Government: #{audience: Audience.Government}}",
      defaultEnvironment: ', "Government"',
      message: "The default environment must use the default audience member.",
    },
    ...[
      "relative/path",
      "ftp://example.com",
      "https://user@example.com",
      "https://example.com/#fragment",
    ].map((endpoint) => ({
      name: `an invalid endpoint ${endpoint}`,
      options: `#{Public: #{audience: Audience.Public, defaultEndpoint: "${endpoint}"}}`,
      defaultEnvironment: "",
      message: "Environment 'Public' must use an absolute HTTP or HTTPS defaultEndpoint.",
    })),
  ])("rejects $name", async ({ options, defaultEnvironment, message }) => {
    expectDiagnostics(
      await Tester.diagnose(`
      ${authentication}
      enum ForeignAudience { Public: "https://search.azure.com" }
      @azureServiceEnvironments(Auth, ${options}${defaultEnvironment})
      namespace Service {}
    `),
      {
        code: "@azure-tools/typespec-azure-core/azure-authentication-invalid",
        message,
      },
    );
  });

  it("does not manufacture audience metadata for ordinary OAuth authentication", async () => {
    expectDiagnostics(
      await Tester.diagnose(`
      ${audience}
      model Auth is AadOauth2Auth<["read"]>;
      @azureServiceEnvironments(Auth, #{Public: #{audience: Audience.Public}})
      namespace Service {}
    `),
      {
        code: "@azure-tools/typespec-azure-core/azure-authentication-invalid",
        message: "Service environments require an Entra default-scope authentication model.",
      },
    );
  });

  it("rejects duplicate declarations for the same target and authentication model", async () => {
    expectDiagnostics(
      await Tester.diagnose(`
      ${authentication}
      @azureServiceEnvironments(Auth, #{Public: #{audience: Audience.Public}})
      @azureServiceEnvironments(Auth, #{Government: #{audience: Audience.Government}})
      namespace Service {}
    `),
      {
        code: "@azure-tools/typespec-azure-core/azure-authentication-invalid",
        message: "Environments for this authentication model are declared more than once.",
      },
    );
  });
});
