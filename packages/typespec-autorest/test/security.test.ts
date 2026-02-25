import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { expect, it } from "vitest";
import {
  compileOpenAPI,
  diagnoseOpenApiFor,
  emitOpenApiWithDiagnostics,
  openApiFor,
} from "./test-host.js";

it("set a basic auth", async () => {
  const res = await openApiFor(`
    @service
    @useAuth(BasicAuth)
    namespace MyService {}
  `);
  deepStrictEqual(res.securityDefinitions, {
    BasicAuth: {
      type: "basic",
    },
  });
  deepStrictEqual(res.security, [{ BasicAuth: [] }]);
});

it("using custom http auth emit warning and doesn't include it", async () => {
  const [res, diagnostics] = await emitOpenApiWithDiagnostics(`
    @service
    @useAuth({ type: AuthType.http, scheme: "SharedAccessKey" })
    namespace MyService {}
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-autorest/unsupported-http-auth-scheme",
    message:
      "The specified HTTP authentication scheme is not supported by this emitter: SharedAccessKey.",
  });
  expect(res.securityDefinitions).not.toBeDefined();
  expect(res.security).not.toBeDefined();
});

it("set a ApiKeyAuth ", async () => {
  const res = await openApiFor(`
    @service
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-my-header">)
    namespace MyService {}
  `);
  deepStrictEqual(res.securityDefinitions, {
    ApiKeyAuth: {
      type: "apiKey",
      in: "header",
      name: "x-my-header",
    },
  });
  deepStrictEqual(res.security, [{ ApiKeyAuth: [] }]);
});

it("set multiple ApiKeyAuth", async () => {
  const res = await compileOpenAPI(`
    @service
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-my-header"> | ApiKeyAuth<ApiKeyLocation.query, "x-my-query">)
    namespace MyService {}
  `);
  expect(res.securityDefinitions).toEqual({
    ApiKeyAuth: {
      type: "apiKey",
      in: "header",
      name: "x-my-header",
    },
    ApiKeyAuth_: {
      in: "query",
      name: "x-my-query",
      type: "apiKey",
    },
  });
  expect(res.security).toEqual([{ ApiKeyAuth: [] }, { ApiKeyAuth_: [] }]);
});

it("set a oauth2 auth", async () => {
  const res = await openApiFor(`
    @service
    @useAuth(OAuth2Auth<[MyFlow]>)
    namespace MyService {
      model MyFlow {
        type: OAuth2FlowType.implicit;
        authorizationUrl: "https://api.example.com/oauth2/authorize";
        refreshUrl: "https://api.example.com/oauth2/refresh";
        scopes: ["read", "write"];
      }
    }
  `);
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
      @service
      @useAuth(MyAuth)
      namespace Foo {
        @doc("My custom basic auth")
        model MyAuth is BasicAuth;
      }
      `,
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
  const res = await openApiFor(`
    @service
    @useAuth(BasicAuth | [ApiKeyAuth<ApiKeyLocation.header, "x-my-header">, BasicAuth])
    namespace MyService {}
  `);
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
  const diagnostics = await diagnoseOpenApiFor(`
    @service
    @useAuth(BearerAuth)
    namespace MyService {}
  `);

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-autorest/unsupported-http-auth-scheme",
  });
});
