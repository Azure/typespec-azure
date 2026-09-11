import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { consistentPatchPropertiesRule } from "../../src/rules/consistent-patch-properties.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    consistentPatchPropertiesRule,
    "tsp-lintdiff-local-linter",
  );
});

describe("consistent-patch-properties", () => {
  describe("inherited property overrides", () => {
    const service = `
      using TypeSpec.Http;
      @Azure.ResourceManager.armProviderNamespace
      @service namespace Microsoft.TestService;
    `;

    for (const nested of [false, true]) {
      it(`ignores a never override in a ${nested ? "nested" : "top-level"} PATCH model`, async () => {
        await tester
          .expect(
            `${service}
            model Base { extra?: string; name?: string; }
            model WithoutExtra extends Base { extra?: never; }
            model Update extends WithoutExtra {}
            model Resource { name?: string; }
            @route("/widgets") @patch
            op update(@body body: ${nested ? "{ properties?: Update }" : "Update"}):
              ${nested ? "{ properties?: Resource }" : "Resource"};
          `,
          )
          .toBeValid();
      });

      it(`reports a property removed by never in a ${nested ? "nested" : "top-level"} resource model`, async () => {
        await tester
          .expect(
            `${service}
            model Base { extra?: string; name?: string; }
            model WithoutExtra extends Base { extra?: never; }
            model Resource extends WithoutExtra {}
            model Update { extra?: string; }
            @route("/widgets") @patch
            op update(@body body: ${nested ? "{ properties?: Update }" : "Update"}):
              ${nested ? "{ properties?: Resource }" : "Resource"};
          `,
          )
          .toEmitDiagnostics({
            code: "tsp-lintdiff-local-linter/consistent-patch-properties",
            message: `The property '${nested ? "properties.extra" : "extra"}' in the request body either does not appear in the resource model or is nested at the wrong level.`,
          });
      });
    }

    it("shadows an inherited property by source name before resolving its encoded name", async () => {
      await tester
        .expect(
          `${service}
          model Base { @encodedName("application/json", "oldName") extra?: string; }
          model Update extends Base {
            @encodedName("application/json", "newName") extra?: never;
          }
          @route("/widgets") @patch
          op update(@body body: Update): { name?: string };
        `,
        )
        .toBeValid();
    });

    it("does not let a never property hide a differently named inherited payload property", async () => {
      await tester
        .expect(
          `${service}
          model Base { @encodedName("application/json", "wireName") present?: string; }
          model Update extends Base {
            @encodedName("application/json", "wireName") removed?: never;
          }
          @route("/widgets") @patch
          op update(@body body: Update): { name?: string };
        `,
        )
        .toEmitDiagnostics({
          code: "tsp-lintdiff-local-linter/consistent-patch-properties",
          message:
            "The property 'wireName' in the request body either does not appear in the resource model or is nested at the wrong level.",
        });
    });

    it("uses a redeclared property's encoded name rather than its base declaration", async () => {
      await tester
        .expect(
          `${service}
          model Base { @encodedName("application/json", "oldName") value?: string; }
          model Update extends Base {
            @encodedName("application/json", "newName") value?: string;
          }
          @route("/widgets") @patch
          op update(@body body: Update): { newName?: string };
        `,
        )
        .toBeValid();
    });
  });

  it("checks nested PATCH properties without loading AutoRest or the client generator core", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        @Azure.ResourceManager.armProviderNamespace
        @service namespace Microsoft.TestService;

        model Resource { properties: { name?: string }; }
        model Update { properties?: { extra?: string }; }

        @route("/widgets") @patch
        op update(@body body: Update): Resource;
      `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/consistent-patch-properties",
        message:
          "The property 'properties.extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
      });
  });

  it("accepts a same-level subset without loading AutoRest or the client generator core", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        @Azure.ResourceManager.armProviderNamespace
        @service namespace Microsoft.TestService;

        model Resource { properties: { name?: string; description?: string }; }
        model Update { properties?: { name?: string }; }

        @route("/widgets") @patch
        op update(@body body: Update): Resource;
      `,
      )
      .toBeValid();
  });

  it("uses the same-path GET model without loading AutoRest or the client generator core", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;
        @Azure.ResourceManager.armProviderNamespace
        @service namespace Microsoft.TestService;

        model Resource { name?: string; }
        model Accepted { @statusCode statusCode: 202; }

        @route("/widgets") @get op read(): Resource;
        @route("/widgets") @patch
        op update(@body body: { extra?: string }): Accepted;
      `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/consistent-patch-properties",
        message:
          "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
      });
  });

  it("uses a response model from a status-code range containing 200", async () => {
    await tester
      .expect(
        `
          using TypeSpec.Http;
          using TypeSpec.Rest;

          @Azure.ResourceManager.armProviderNamespace
          @service(#{ title: "Test Service" })
          namespace Microsoft.TestService;

          model Widget {
            name: string;
          }

          model WidgetPatch {
            extra: string;
          }

          model SuccessResponse {
            @minValue(200)
            @maxValue(299)
            @statusCode
            statusCode: int32;

            @body body: Widget;
          }

          @route("/widgets/{name}")
          @patch
          op update(@path name: string, @body body: WidgetPatch): SuccessResponse;
        `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/consistent-patch-properties",
        severity: "warning",
        message:
          "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
      });
  });

  describe("client scope does not change the native PATCH contract", () => {
    beforeEach(async () => {
      const runner = await createTester(resolvePath(import.meta.dirname, "../.."), {
        libraries: [
          "@typespec/http",
          "@typespec/openapi",
          "@typespec/rest",
          "@typespec/versioning",
          "@azure-tools/typespec-azure-core",
          "@azure-tools/typespec-azure-resource-manager",
          "@azure-tools/typespec-client-generator-core",
        ],
      })
        .importLibraries()
        .createInstance();
      tester = createLinterRuleTester(
        runner,
        consistentPatchPropertiesRule,
        "tsp-lintdiff-local-linter",
      );
    });

    const service = `
        using TypeSpec.Http;
        using Azure.ClientGenerator.Core;
        @Azure.ResourceManager.armProviderNamespace
        @service namespace Microsoft.TestService;
        model Resource { name?: string; }
      `;

    it("checks a property scoped away from AutoRest", async () => {
      await tester
        .expect(
          `${service}
            model Update { @scope("csharp") extra?: string; }
            @route("/widgets") @patch op update(@body body: Update): Resource;
          `,
        )
        .toEmitDiagnostics({
          code: "tsp-lintdiff-local-linter/consistent-patch-properties",
          message:
            "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
        });
    });

    it("checks a PATCH operation scoped away from AutoRest", async () => {
      await tester
        .expect(
          `${service}
            @route("/widgets") @patch @scope("csharp")
            op update(@body body: { extra?: string }): Resource;
          `,
        )
        .toEmitDiagnostics({
          code: "tsp-lintdiff-local-linter/consistent-patch-properties",
          message:
            "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
        });
    });

    it("uses a GET fallback scoped away from AutoRest", async () => {
      await tester
        .expect(
          `${service}
            model Accepted { @statusCode statusCode: 202; }
            @route("/widgets") @get @scope("csharp") op read(): Resource;
            @route("/widgets") @patch
            op update(@body body: { extra?: string }): Accepted;
          `,
        )
        .toEmitDiagnostics({
          code: "tsp-lintdiff-local-linter/consistent-patch-properties",
          message:
            "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
        });
    });

    it("accepts a matching response property scoped away from AutoRest", async () => {
      await tester
        .expect(
          `${service}
            model ScopedResource { @scope("csharp") name?: string; }
            @route("/widgets") @patch
            op update(@body body: { name?: string }): ScopedResource;
          `,
        )
        .toBeValid();
    });
  });

  it("prefers an exact response over an overlapping status-code range", async () => {
    await tester
      .expect(
        `
          using TypeSpec.Http;
          using TypeSpec.Rest;

          @Azure.ResourceManager.armProviderNamespace
          @service(#{ title: "Test Service" })
          namespace Microsoft.TestService;

          model Widget {
            name: string;
          }

          model WidgetPatch {
            extra: string;
          }

          model RangeResponse {
            @minValue(200)
            @maxValue(299)
            @statusCode
            statusCode: int32;

            @body body: WidgetPatch;
          }

          model ExactResponse {
            @statusCode statusCode: 200;
            @body body: Widget;
          }

          @route("/widgets/{name}")
          @patch
          op update(@path name: string, @body body: WidgetPatch): RangeResponse | ExactResponse;
        `,
      )
      .toEmitDiagnostics({
        code: "tsp-lintdiff-local-linter/consistent-patch-properties",
        severity: "warning",
        message:
          "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
      });
  });
});
