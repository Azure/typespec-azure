import {
  expectDiagnosticEmpty,
  expectDiagnostics,
  resolveVirtualPath,
  t,
} from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { describe, it } from "vitest";
import { getRef } from "../src/decorators.js";
import { BasicTester, ignoreDiagnostics, ignoreUseStandardOps, openApiFor } from "./test-host.js";

describe("typespec-autorest: decorators", () => {
  describe("@useRef", () => {
    it("emit diagnostic if use on non model or property", async () => {
      const diagnostics = await BasicTester.diagnose(`
        @useRef("foo")
        op foo(): string;
      `);
      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "decorator-wrong-target",
        message:
          "Cannot apply @useRef decorator to foo since it is not assignable to Model | ModelProperty",
      });
    });

    it("emit diagnostic if ref is not a string", async () => {
      const diagnostics = await BasicTester.diagnose(`
        @useRef(123)
        model Foo {}
      `);
      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "invalid-argument",
      });
    });

    it("emit diagnostic if ref is not passed", async () => {
      const diagnostics = await BasicTester.diagnose(`
        @useRef
        model Foo {}
      `);
      expectDiagnostics(ignoreUseStandardOps(diagnostics), [
        {
          code: "invalid-argument-count",
          message: "Expected 1 arguments, but got 0.",
        },
      ]);
    });

    it("set external reference", async () => {
      const [{ Foo, program }, diagnostics] = await BasicTester.compileAndDiagnose(t.code`
        @useRef("../common.json#/definitions/Foo")
        model ${t.model("Foo")} {}
      `);
      expectDiagnosticEmpty(
        ignoreDiagnostics(diagnostics, [
          "@azure-tools/typespec-azure-core/use-standard-operations",
          "@typespec/http/no-service-found",
        ]),
      );
      strictEqual(getRef(program, Foo), "../common.json#/definitions/Foo");
    });

    describe("interpolate arm-types-dir", () => {
      async function testArmTypesDir(options?: any) {
        const code = `
          @useRef("{arm-types-dir}/common.json#/definitions/Foo")
          model Foo {}

          model Bar {
            foo: Foo;
          }
        `;
        const outputDir = resolveVirtualPath(`specification/org/service/output`);
        const [{ outputs }, diagnostics] = await BasicTester.emit(
          "@azure-tools/typespec-autorest",
          {
            ...options,
            "emitter-output-dir": outputDir,
          },
        ).compileAndDiagnose(code, {
          options: {
            config: resolveVirtualPath("specification/org/service/tspconfig.json"),
          },
        });
        expectDiagnosticEmpty(
          ignoreDiagnostics(diagnostics, [
            "@azure-tools/typespec-azure-core/use-standard-operations",
            "@typespec/http/no-service-found",
          ]),
        );
        const openAPI = JSON.parse(outputs["openapi.json"]);
        return openAPI.definitions.Bar.properties.foo.$ref;
      }
      // project-root resolve to "" in test
      it("To ${project-root}../../ by default", async () => {
        const ref = await testArmTypesDir();
        strictEqual(ref, "../../../common-types/resource-management/common.json#/definitions/Foo");
      });

      it("configure a new absolute value", async () => {
        const ref = await testArmTypesDir({
          "arm-types-dir": "{project-root}/../other/path",
        });
        strictEqual(ref, "../../other/path/common.json#/definitions/Foo");
      });

      it("keeps relative value as it is", async () => {
        const ref = await testArmTypesDir({
          "arm-types-dir": "../other/path",
        });
        strictEqual(ref, "../other/path/common.json#/definitions/Foo");
      });
    });
  });

  describe("@operationId", () => {
    it("preserves casing of explicit @operationId decorator", async () => {
      const openapi = await openApiFor(`
        @get
        @operationId("Pets_GET")
        op read(): string;
      `);
      deepStrictEqual(openapi.paths["/"].get.operationId, "Pets_GET");
    });
  });
});
