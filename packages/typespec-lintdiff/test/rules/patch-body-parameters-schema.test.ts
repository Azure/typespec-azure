import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { patchBodyParametersSchemaRule } from "../../src/rules/patch-body-parameters-schema.js";

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
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    patchBodyParametersSchemaRule,
    "tsp-lintdiff-local-linter",
  );
});

const service = `
  using TypeSpec.Http;
  @Azure.ResourceManager.armProviderNamespace
  @service namespace Microsoft.TestService;
`;

describe("patch-body-parameters-schema payload kinds", () => {
  it.each([
    [
      "multipart model",
      `@header contentType: "multipart/form-data",
       @multipartBody body: { name: HttpPart<string>; contents: HttpPart<bytes> }`,
    ],
    [
      "multipart tuple",
      `@header contentType: "multipart/form-data",
       @multipartBody body: [HttpPart<string, #{ name: "name" }>]`,
    ],
    ["file", "@bodyRoot body: File"],
    ["single binary", '@header contentType: "application/octet-stream", @body body: bytes'],
  ])("does not inspect %s payload properties", async (_, parameters) => {
    await tester
      .expect(`${service} @route("/widgets") @patch op update(${parameters}): void;`)
      .toBeValid();
  });

  it.each(["PatchBody", "PatchBody | null"])(
    "preserves all checks for a single %s payload",
    async (bodyType) => {
      await tester
        .expect(
          `${service}
          model PatchBody {
            name: string;
            enabled?: boolean = false;
            @visibility(Lifecycle.Create) createdBy?: string;
          }
          @route("/widgets") @patch op update(@body body: ${bodyType}): void;
          `,
        )
        .toEmitDiagnostics([
          {
            code: "tsp-lintdiff-local-linter/patch-body-parameters-schema",
            message: "Properties of a PATCH request body must not be required, property:name.",
          },
          {
            code: "tsp-lintdiff-local-linter/patch-body-parameters-schema",
            message:
              "Properties of a PATCH request body must not have default value, property:enabled.",
          },
          {
            code: "tsp-lintdiff-local-linter/patch-body-parameters-schema",
            message:
              'Properties of a PATCH request body must not be x-ms-mutability: ["create"], property:createdBy.',
          },
        ]);
    },
  );
});
