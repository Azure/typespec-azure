import { afterAll, assert, describe, it } from "vitest";

import { Project } from "ts-morph";
import { buildGetClientOptionsParam } from "../../src/modular/helpers/client-helpers.js";
import type { ModularEmitterOptions } from "../../src/modular/interfaces.js";
import {
  emitModularClientContextFromTypeSpec,
  emitModularOperationsFromTypeSpec,
} from "../util/emit-util.js";
import { clearCompileCache } from "../util/test-util.js";

afterAll(clearCompileCache);

describe("client option forwarding", () => {
  const credentialSpec = `
    import "@typespec/http";
    import "@typespec/rest";
    import "@azure-tools/typespec-azure-core";

    using TypeSpec.Http;
    using TypeSpec.Rest;
    using Azure.Core;

    @useAuth(
      OAuth2Auth<[
        {
          type: OAuth2FlowType.implicit,
          authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize",
          scopes: ["https://example.com/.default"],
        }
      ]>
    )
    @service(#{ title: "ScopeClient" })
    @server("{endpoint}", "Service endpoint", { endpoint: url })
    namespace ScopeService;

    @route("/read")
    @get
    op read(): void;
  `;

  it("merges normalized operation headers with generated service headers", async () => {
    const result = await emitModularOperationsFromTypeSpec(`
      @route("/read")
      @get
      op read(@header("x-service-header") serviceHeader: string): void;
    `);
    const text = result![0]!.getFullText();

    assert.include(text, "const requestParameters = operationOptionsToRequestParameters(options);");
    assert.include(text, '"x-service-header": serviceHeader');
    // The core helper folds deprecated customHeaders into this normalized headers bag.
    assert.include(text, "...requestParameters.headers");
    assert.notInclude(text, "...options.requestOptions?.headers");
  });

  it("normalizes legacy credential scopes after current credential options", () => {
    const text = emitGetClientOptions();
    const currentScopes = text.indexOf("options.credentials?.scopes");
    const legacyStringScopes = text.indexOf('typeof options.credentialScopes === "string"');
    const legacyArrayScopes = text.indexOf(": options.credentialScopes");
    const generatedScopes = text.indexOf('"https://example.com/.default"');

    assert.isAtLeast(currentScopes, 0);
    assert.isAbove(legacyStringScopes, currentScopes);
    assert.include(text, "? [options.credentialScopes]");
    assert.isAbove(legacyArrayScopes, legacyStringScopes);
    assert.isAbove(generatedScopes, legacyArrayScopes);
  });

  it("declares the deprecated credential scopes alias on scoped client options only", async () => {
    const scopedResult = await emitModularClientContextFromTypeSpec(credentialSpec, {
      "add-credentials": true,
      "credential-scopes": ["https://example.com/.default"],
    });
    const scopedText = scopedResult!.getFullText();

    assert.include(
      scopedText,
      "export interface ScopeServiceClientOptionalParams extends ClientOptions",
    );
    assert.include(scopedText, "@deprecated Use `credentials.scopes` instead.");
    assert.include(scopedText, "credentialScopes?: string | string[];");

    const unscopedResult = await emitModularClientContextFromTypeSpec(`
      @route("/read")
      @get
      op read(): void;
    `);
    assert.notInclude(unscopedResult!.getFullText(), "credentialScopes");
  });

  it("preserves logging header and query allowlists while defaulting the logger", () => {
    const text = emitGetClientOptions();

    assert.include(
      text,
      "loggingOptions: { ...options.loggingOptions, logger: options.loggingOptions?.logger ?? logger.info }",
    );
  });
});

function emitGetClientOptions(): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const factory = project.createSourceFile("client.ts").addFunction({ name: "createClient" });
  const emitterOptions: ModularEmitterOptions = {
    options: {
      addCredentials: true,
      credentialScopes: ["https://example.com/.default"],
    },
    modularOptions: {
      sourceRoot: "",
      compatibilityMode: false,
      experimentalExtensibleEnums: false,
    },
  };

  buildGetClientOptionsParam(factory, emitterOptions, "endpoint");
  return factory.getText();
}
