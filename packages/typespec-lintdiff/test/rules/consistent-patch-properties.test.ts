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
