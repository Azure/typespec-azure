import { Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { getAzureTokenAuthentication } from "./azure-authentication.js";

const audience = `
  enum Audience {
    Government: "https://search.azure.us",
    Public: "https://search.azure.com",
  }
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
      audience: { defaultAudience: "https://monitor.azure.com/" },
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

  it("rejects a string profile kind", async () => {
    expectDiagnostics(
      await Tester.diagnose(`${audience}
        @azureTokenAuthentication(#{kind: "entraDefaultScope", defaultAudience: Audience.Public})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`),
      { code: "invalid-argument" },
    );
  });

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
    ...["", " https://search.azure.com"].map((value) => ({
      name: `an invalid resource '${value}'`,
      code: `
        enum Audience { Public: "${value}" }
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;`,
      message: "Audience resources must be non-empty strings without surrounding whitespace.",
    })),
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
      code: `${audience}
        @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
        model Auth is ApiKeyAuth<ApiKeyLocation.header, "api-key">;`,
      message: "The target must be an OAuth authentication model.",
    },
  ])("rejects $name", async ({ code, message }) => {
    expectDiagnostics(await Tester.diagnose(code), {
      code: "@azure-tools/typespec-azure-core/azure-authentication-invalid",
      message,
    });
  });
});
