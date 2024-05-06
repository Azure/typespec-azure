import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { diagnoseOpenApiFor, ignoreDiagnostics, openApiFor } from "./test-host.js";

it("set a basic auth", async () => {
  const res = await openApiFor(
    `
    @service({title: "My service"})
    @useAuth(BasicAuth)
    namespace MyService {}
    `
  );
  deepStrictEqual(res.securityDefinitions, {
    BasicAuth: {
      type: "basic",
    },
  });
  deepStrictEqual(res.security, [{ BasicAuth: [] }]);
});

it("set a ApiKeyAuth ", async () => {
  const res = await openApiFor(
    `
    @service({title: "My service"})
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-my-header">)
    namespace MyService {}
    `
  );
  deepStrictEqual(res.securityDefinitions, {
    ApiKeyAuth: {
      type: "apiKey",
      in: "header",
      name: "x-my-header",
    },
  });
  deepStrictEqual(res.security, [{ ApiKeyAuth: [] }]);
});

it("set a oauth2 auth", async () => {
  const res = await openApiFor(
    `
    @service({title: "My service"})
   
    @useAuth(OAuth2Auth<[MyFlow]>)
    namespace MyService {
      model MyFlow {
        type: OAuth2FlowType.implicit;
        authorizationUrl: "https://api.example.com/oauth2/authorize";
        refreshUrl: "https://api.example.com/oauth2/refresh";
        scopes: ["read", "write"];
      }
    }
    `
  );
  deepStrictEqual(res.securityDefinitions, {
    OAuth2Auth: {
      type: "oauth2",
      flow: "implicit",
      authorizationUrl: "https://api.example.com/oauth2/authorize",
      scopes: {
        read: "",
        write: "",
      },
    },
  });
  deepStrictEqual(res.security, [{ OAuth2Auth: ["read", "write"] }]);
});

it("can specify custom auth name with description", async () => {
  const res = await openApiFor(
    `
    @service({title: "My service"})
    @useAuth(MyAuth)
    @test namespace Foo {
      @doc("My custom basic auth")
      model MyAuth is BasicAuth;
    }
    `
  );
  deepStrictEqual(res.securityDefinitions, {
    MyAuth: {
      type: "basic",
      description: "My custom basic auth",
    },
  });
  deepStrictEqual(res.security, [{ MyAuth: [] }]);
});

it("can use multiple auth", async () => {
  const res = await openApiFor(
    `
    @service({title: "My service"})
    @useAuth(BasicAuth | [ApiKeyAuth<ApiKeyLocation.header, "x-my-header">, BasicAuth])
    namespace MyService {}
    `
  );
  deepStrictEqual(res.securityDefinitions, {
    ApiKeyAuth: {
      in: "header",
      name: "x-my-header",
      type: "apiKey",
    },
    BasicAuth: {
      type: "basic",
    },
  });
  deepStrictEqual(res.security, [
    {
      BasicAuth: [],
    },
    {
      ApiKeyAuth: [],
      BasicAuth: [],
    },
  ]);
});

it("emits a diagnostic for unsupported HTTP authentication schemes", async () => {
  const diagnostics = await diagnoseOpenApiFor(
    `
    @service({title: "My service"})
    @useAuth(BearerAuth)
    namespace MyService {}
    `
  );

  expectDiagnostics(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]), [
    {
      code: "@azure-tools/typespec-autorest/unsupported-http-auth-scheme",
    },
  ]);
});
