import { expectDiagnostics } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { compileOpenAPI, diagnoseOpenApiFor } from "./test-host.js";

const code = `
  @service
  namespace MyService;

  namespace LiftrBase {
    model MarketplaceDetails {}
  }

  op read(): LiftrBase.MarketplaceDetails;
`;

// Two models with the same name in different namespaces.
const sameNameInDifferentNamespaces = `
  @service
  namespace MyService;

  namespace LiftrBase {
    model Widget {}
  }
  namespace Other {
    model Widget {}
  }

  @route("/a") op a(): LiftrBase.Widget;
  @route("/b") op b(): Other.Widget;
`;

describe("default (namespaced)", () => {
  it("keeps the namespace prefix in the definition name", async () => {
    const oapi = await compileOpenAPI(code);
    expect(oapi.definitions).toHaveProperty(["LiftrBase.MarketplaceDetails"]);
  });

  it("is the behavior when type-name-strategy is explicitly namespaced", async () => {
    const oapi = await compileOpenAPI(code, { options: { "type-name-strategy": "namespaced" } });
    expect(oapi.definitions).toHaveProperty(["LiftrBase.MarketplaceDetails"]);
  });

  it("same name in different namespaces do not conflict", async () => {
    const oapi = await compileOpenAPI(sameNameInDifferentNamespaces);
    expect(oapi.definitions).toHaveProperty(["LiftrBase.Widget"]);
    expect(oapi.definitions).toHaveProperty(["Other.Widget"]);
  });
});

describe("name-only", () => {
  it("removes the namespace from the definition name", async () => {
    const oapi = await compileOpenAPI(code, { options: { "type-name-strategy": "name-only" } });
    expect(oapi.definitions).toHaveProperty("MarketplaceDetails");
    expect(oapi.definitions).not.toHaveProperty(["LiftrBase.MarketplaceDetails"]);
  });

  it("reports an error when two types collapse to the same name", async () => {
    const diagnostics = await diagnoseOpenApiFor(sameNameInDifferentNamespaces, {
      "type-name-strategy": "name-only",
    });

    expectDiagnostics(diagnostics, [{ code: "@typespec/openapi/duplicate-type-name" }]);
  });

  it("still honors @friendlyName over the name-only strategy", async () => {
    const oapi = await compileOpenAPI(
      `
      @service
      namespace MyService;

      namespace LiftrBase {
        @friendlyName("CustomName")
        model MarketplaceDetails {}
      }

      op read(): LiftrBase.MarketplaceDetails;
      `,
      { options: { "type-name-strategy": "name-only" } },
    );
    expect(oapi.definitions).toHaveProperty("CustomName");
  });
});
