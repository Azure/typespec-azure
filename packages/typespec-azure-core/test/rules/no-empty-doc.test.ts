import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";

import { beforeEach, describe, it } from "vitest";
import { noEmptyDocRule } from "../../src/rules/no-empty-doc.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noEmptyDocRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/no-empty-doc",
  message: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
};

describe("no-empty-doc", () => {
  it.each([
    '@doc(" ") namespace Widgets {}',
    '@doc(" ") interface Widgets {}',
    '@doc(" ") op read(): string;',
    '@doc(" ") model Widget {}',
    '@doc(" ") scalar Label extends string;',
    '@doc(" ") enum State { Ready }',
    '@doc(" ") union State { ready: "ready", string }',
    'union State { @doc(" ") ready: "ready", string }',
  ])("rejects explicit whitespace documentation: %s", async (code) => {
    await tester.expect(code).toEmitDiagnostics([diagnostic]);
  });

  it.each(["", " ", "\\t\\r\\n", "\u00a0"])("rejects blank content %j", async (doc) => {
    await tester.expect(`@doc("${doc}") model Widget {}`).toEmitDiagnostics([diagnostic]);
  });

  it.each([
    "model Widget { name: string; }",
    "op read(name: string): string;",
    '@doc("A widget resource") model Widget {}',
    '@doc("  A widget resource  ") model Widget {}',
    '@doc(".") model Widget {}',
    "/** A widget resource */ model Widget {}",
  ])("accepts missing or nonblank documentation: %s", async (code) => {
    await tester.expect(code).toBeValid();
  });

  it("rejects a whitespace-only property description", async () => {
    await tester
      .expect(
        `
        model Widget {
          @doc(" ")
          name: string;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("rejects a whitespace-only parameter description", async () => {
    await tester.expect('op read(@doc(" ") name: string): string;').toEmitDiagnostics([diagnostic]);
  });

  it("accepts nonblank descriptions on models, properties, and operations", async () => {
    await tester
      .expect(
        `
        @doc("A widget resource")
        model Widget {
          @doc("The widget name.")
          name: string;
        }
        @doc("Read a widget.")
        op read(@doc("The widget name.") name: string): Widget;
      `,
      )
      .toBeValid();
  });

  it("validates the standard incorrect and correct examples", async () => {
    const examples = [
      `model Widget {
  @doc(" ")
  name: string;
}
`,
      `model Widget {
  @doc("The widget name.")
  name: string;
}
`,
    ];

    await tester.expect(examples[0]).toEmitDiagnostics([diagnostic]);
    await tester.expect(examples[1]).toBeValid();
  });

  it("targets offending properties rather than their containing model", async () => {
    await tester
      .expect(
        `
        model Widget {
          @doc("") /*name*/name: string;
          @doc(" ") /*value*/value: string;
          @doc("A valid label") label: string;
        }
      `,
      )
      .toEmitDiagnostics(({ name, value }) =>
        [name, value].map((target) => {
          const location = getSourceLocation(target);
          return {
            ...diagnostic,
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          };
        }),
      );
  });

  it("targets offending enum members rather than their containing enum", async () => {
    await tester
      .expect(
        `
        enum State {
          @doc(" ") /*ready*/Ready
        }
      `,
      )
      .toEmitDiagnostics(({ ready }) => {
        const location = getSourceLocation(ready);
        return [
          {
            ...diagnostic,
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          },
        ];
      });
  });
});
