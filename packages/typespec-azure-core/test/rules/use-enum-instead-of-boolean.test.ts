import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useEnumInsteadOfBooleanRule } from "../../src/rules/use-enum-instead-of-boolean.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useEnumInsteadOfBooleanRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("boolean shapes should use descriptive extensible enums", () => {
  it("emits warning for boolean model properties", async () => {
    await tester
      .expect(
        `
        model Widget {
          enabled: boolean;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/use-enum-instead-of-boolean",
        message:
          "Consider using an extensible enum instead of a boolean property so the API shape is more descriptive.",
      });
  });

  it("emits warning for boolean path parameters", async () => {
    await tester
      .expect(
        `
        @route("/widgets/{enabled}")
        @get
        op getWidget(@path enabled: boolean): string;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/use-enum-instead-of-boolean",
      });
  });

  it("emits warning for boolean request bodies", async () => {
    await tester
      .expect(
        `
        @post
        op checkWidget(@body body: boolean): string;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/use-enum-instead-of-boolean",
      });
  });

  it("emits warning for boolean response bodies", async () => {
    await tester
      .expect(
        `
        @get
        op isWidgetEnabled(): boolean;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/use-enum-instead-of-boolean",
      });
  });

  it("allows comparable non-boolean shapes", async () => {
    await tester
      .expect(
        `
        union WidgetState {
          Enabled: "Enabled",
          Disabled: "Disabled",
          string,
        }

        model Widget {
          state: WidgetState;
        }

        @post
        op checkWidget(@body body: WidgetState): WidgetState;
        `,
      )
      .toBeValid();
  });
});
