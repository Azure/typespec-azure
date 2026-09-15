import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { putRequestResponseSchemeArmRule } from "../../src/rules/put-request-response-scheme-arm.js";
import { putRequestResponseSchemeRule } from "../../src/rules/put-request-response-scheme.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "Azure.ResourceManager");

for (const [audience, rule] of [
  ["ARM", putRequestResponseSchemeArmRule],
  ["data-plane", putRequestResponseSchemeRule],
] as const) {
  describe(`${audience} PUT request/response unions`, () => {
    const RuleTester = Tester.wrap(
      (code) => `
        @service
        ${audience === "ARM" ? "@armProviderNamespace" : ""}
        namespace TestService {
          model Response<Status extends int32, T> {
            @statusCode statusCode: Status;
            @body body: T;
          }
          ${code}
        }
      `,
    );

    async function expect(code: string) {
      return createLinterRuleTester(
        await RuleTester.createInstance(),
        rule,
        "tsp-lintdiff-local-linter",
      ).expect(code);
    }

    const diagnostic = {
      code: `tsp-lintdiff-local-linter/${rule.name}`,
      severity: "warning" as const,
      message: "PUT request body schema should match the 200 response schema.",
    };

    it.each([
      ['string, "active", "inactive"', '"inactive", string, "active"'],
      [
        'string, active: "active", inactive: "inactive"',
        'inactive: "inactive", active: "active", string',
      ],
    ])("accepts separate equivalent open unions (%s)", async (left, right) => {
      await (
        await expect(`
          union RequestState { ${left} }
          union ResponseState { ${right} }
          model Request { state?: RequestState; }
          model Result { state?: ResponseState; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toBeValid();
    });

    it("accepts models sharing the same union", async () => {
      await (
        await expect(`
          union State { string, active: "active" }
          model Request { state?: State; }
          model Result { state?: State; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toBeValid();
    });

    it.each([
      ["string", 'state: "active"', 'state: "active"'],
      ["string", "state", 'state: "state"'],
      ["int32", "state: 1", "state: 1"],
    ])("accepts equivalent enum-member variants (%s, %s)", async (base, left, right) => {
      await (
        await expect(`
          enum RequestValues { ${left} }
          enum ResponseValues { ${right} }
          union RequestState { ${base}, RequestValues.state }
          union ResponseState { ${base}, ResponseValues.state }
          model Request { state: RequestState; }
          model Result { state: ResponseState; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toBeValid();
    });

    it.each([
      ["string", '"active"', '"inactive"'],
      ["int32", "1", "2"],
    ])("reports different enum-member values (%s, %s versus %s)", async (base, left, right) => {
      await (
        await expect(`
          enum RequestValues { state: ${left} }
          enum ResponseValues { state: ${right} }
          union RequestState { ${base}, RequestValues.state }
          union ResponseState { ${base}, ResponseValues.state }
          model Request { state: RequestState; }
          model Result { state: ResponseState; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toEmitDiagnostics(diagnostic);
    });

    it.each([
      ['string, "active"', 'string, "inactive"'],
      ['string, "active"', 'boolean, "active"'],
      ['string, active: "active"', 'string, active: "inactive"'],
      ['string, active: "active"', 'string, other: "active"'],
      ['string, "active"', 'string, "active", "inactive"'],
    ])("reports genuinely different union members (%s versus %s)", async (left, right) => {
      await (
        await expect(`
          union RequestState { ${left} }
          union ResponseState { ${right} }
          model Request { state?: RequestState; }
          model Result { state?: ResponseState; }
          @put @route("/widgets") op /*put*/put(@body body: Request): Result;
        `)
      ).toEmitDiagnostics(({ put }) => ({
        ...diagnostic,
        pos: getSourceLocation(put).pos,
        end: getSourceLocation(put).end,
      }));
    });

    it("matches unnamed model variants one-to-one without reusing failed comparisons", async () => {
      await (
        await expect(`
          model LeftA { value: string; }
          model LeftB { value: string; }
          model RightA { value: string; }
          model RightB { value: int32; }
          union RequestChoice { LeftA, LeftB }
          union ResponseChoice { RightB, RightA }
          model Request { choice: RequestChoice; }
          model Result { choice: ResponseChoice; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toEmitDiagnostics(diagnostic);
    });

    it("accepts reordered equivalent unnamed model variants", async () => {
      await (
        await expect(`
          model LeftA { text: string; }
          model LeftB { count: int32; }
          model RightA { text: string; }
          model RightB { count: int32; }
          union RequestChoice { LeftA, LeftB }
          union ResponseChoice { RightB, RightA }
          model Request { choice: RequestChoice; }
          model Result { choice: ResponseChoice; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toBeValid();
    });

    it("terminates when matching recursive unnamed union members", async () => {
      await (
        await expect(`
          union RequestChoice { string, RequestNode }
          union ResponseChoice { ResponseNode, string }
          model RequestNode { next?: RequestChoice; }
          model ResponseNode { next?: ResponseChoice; }
          model Request { choice: RequestChoice; }
          model Result { choice: ResponseChoice; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toBeValid();
    });

    it("accepts equivalent recursive models with separate open unions", async () => {
      await (
        await expect(`
          union RequestState { string, active: "active" }
          union ResponseState { string, active: "active" }
          model Request { state: RequestState; next?: Request; }
          model Result { state: ResponseState; next?: Result; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toBeValid();
    });

    it("still reports mismatched properties alongside equivalent open unions", async () => {
      await (
        await expect(`
          union RequestState { string, active: "active" }
          union ResponseState { string, active: "active" }
          model Request { state: RequestState; next?: Request; }
          model Result { state: ResponseState; next?: Result; extra?: string; }
          @put @route("/widgets") op put(@body body: Request): Result;
        `)
      ).toEmitDiagnostics(diagnostic);
    });

    it("prefers 200 over a different 201 response", async () => {
      await (
        await expect(`
          union RequestState { string, active: "active" }
          union ResponseState { string, active: "active" }
          model Request { state: RequestState; }
          model Result { state: ResponseState; }
          @put @route("/widgets") op put(@body body: Request):
            Response<200, Result> | Response<201, string>;
        `)
      ).toBeValid();
    });

    it("compares equivalent open unions against the 201 fallback", async () => {
      await (
        await expect(`
          union RequestState { string, active: "active" }
          union ResponseState { string, active: "active" }
          model Request { state: RequestState; }
          model Result { state: ResponseState; }
          @put @route("/widgets") op put(@body body: Request): Response<201, Result>;
        `)
      ).toBeValid();
    });

    it.each(["", "@body body: void"])("skips an absent request body (%s)", async (parameters) => {
      await (
        await expect(`
          union State { string, active: "active" }
          model Result { state: State; }
          @put @route("/widgets") op put(${parameters}): Result;
        `)
      ).toBeValid();
    });
  });
}
