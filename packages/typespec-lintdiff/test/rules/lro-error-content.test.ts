import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { lroErrorContentRule } from "../../src/rules/lro-error-content.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-autorest",
  ],
}).importLibraries();

const header = `
  using TypeSpec.Http;
  using TypeSpec.OpenAPI;
  using Azure.ResourceManager;
`;
const diagnostic = {
  code: "tsp-lintdiff-local-linter/lro-error-content",
  message: lroErrorContentRule.messages.default,
};

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    lroErrorContentRule,
    "tsp-lintdiff-local-linter",
  );
}

describe("lro-error-content", () => {
  it("ignores operations scoped out of AutoRest", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @armProviderNamespace @service namespace Arm;
      @error model Error { code: string; }
      @Azure.ClientGenerator.Core.scope("csharp")
      @extension("x-ms-long-running-operation", true)
      @route("/sdk-only") @post op sdkOnly(): AcceptedResponse | Error;
    `,
      )
      .toBeValid();
  });

  it("does not lint an unrelated data-plane service or unused templates", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @service namespace DataPlane {
        @error model Error { code: string; }
        @extension("x-ms-long-running-operation", true)
        @route("/run") @post op run(): AcceptedResponse | Error;
      }
      @armProviderNamespace @service namespace Arm {
        @error model Error { code: string; }
        @extension("x-ms-long-running-operation", true)
        @route("/template") @post op unused<T>(): AcceptedResponse | Error;
      }
    `,
      )
      .toBeValid();
  });

  it("reports once per operation across error statuses and service versions", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      using TypeSpec.Versioning;
      @armProviderNamespace @service @versioned(Versions)
      namespace Arm;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Error { code: string; }
      @extension("x-ms-long-running-operation", true)
      @route("/run") @post op run(): AcceptedResponse |
        { @statusCode statusCode: 400; @body body: Error; } |
        { @statusCode statusCode: 500; @body body: Error; };
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("includes operations in nested ARM namespaces", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @armProviderNamespace @service namespace Arm {
        namespace Nested {
          @error model Error { code: string; }
          @extension("x-ms-long-running-operation", true)
          @route("/run") @post op run(): AcceptedResponse | Error;
        }
      }
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores an explicit false extension", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @armProviderNamespace @service namespace Arm;
      @error model Error { code: string; }
      @extension("x-ms-long-running-operation", false)
      @route("/run") @post op run(): AcceptedResponse | Error;
    `,
      )
      .toBeValid();
  });
});
