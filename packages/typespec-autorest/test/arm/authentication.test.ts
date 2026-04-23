import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { compileOpenAPI } from "../test-host.js";

it("@armProviderNamespace emits the legacy user_impersonation scope in OpenAPI v2 securityDefinitions", async () => {
  const openapi: any = await compileOpenAPI(
    `
      @armProviderNamespace
      namespace Microsoft.Test {
        interface Operations extends Azure.ResourceManager.Operations {}
      }
    `,
    { preset: "azure" },
  );

  deepStrictEqual(openapi.securityDefinitions, {
    azure_auth: {
      type: "oauth2",
      description: "Azure Active Directory OAuth2 Flow.",
      flow: "implicit",
      authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize",
      scopes: {
        user_impersonation: "impersonate your user account",
      },
    },
  });

  deepStrictEqual(openapi.security, [{ azure_auth: ["user_impersonation"] }]);
});
