import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { enumInsteadOfBooleanRule } from "../../src/rules/enum-instead-of-boolean.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    enumInsteadOfBooleanRule,
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
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
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
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
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
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
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
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits warning for scalar types derived from boolean", async () => {
    await tester
      .expect(
        `
        scalar Toggle extends boolean;

        model Widget {
          enabled: Toggle;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits warning for array properties containing booleans", async () => {
    await tester
      .expect(
        `
        model Widget {
          enabledFlags: boolean[];
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits warning for record properties containing booleans", async () => {
    await tester
      .expect(
        `
        model Widget {
          enabledByGroup: Record<boolean>;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits warning for tuple properties containing booleans", async () => {
    await tester
      .expect(
        `
        model Widget {
          states: [string, boolean];
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits warning for union properties containing booleans", async () => {
    await tester
      .expect(
        `
        union WidgetState {
          "unknown",
          boolean,
        }

        model Widget {
          state: WidgetState;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits warning for array response bodies containing booleans", async () => {
    await tester
      .expect(
        `
        @get
        op listWidgetStates(): boolean[];
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
      });
  });

  it("emits one warning for boolean response envelope bodies", async () => {
    await tester
      .expect(
        `
        model WidgetEnabledResponse {
          @body body: boolean;
        }

        @get
        op isWidgetEnabled(): WidgetEnabledResponse;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/enum-instead-of-boolean",
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
          states: WidgetState[];
          statesByGroup: Record<WidgetState>;
        }

        @post
        op checkWidget(@body body: WidgetState): WidgetState[];
        `,
      )
      .toBeValid();
  });
});
