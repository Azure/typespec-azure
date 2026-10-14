import { getDoc, getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";

import { beforeEach, describe, it } from "vitest";
import { requireDocumentation } from "../../src/rules/require-docs.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    {
      ...requireDocumentation,
      create(context) {
        return requireDocumentation.create({
          ...context,
          // Missing-doc behavior is covered by require-docs.test.ts; these fixtures isolate authored docs.
          reportDiagnostic(diagnostic) {
            if (
              getDoc(context.program, diagnostic.target as Parameters<typeof getDoc>[1]) !==
              undefined
            ) {
              context.reportDiagnostic(diagnostic);
            }
          },
        });
      },
    },
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/documentation-required",
  message: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
};

describe("documentation-required: empty documentation", () => {
  it.each([
    '@doc("Payload data.") model Payload { data: { @doc(" ") value: string }; }',
    '@doc("Available values.") union Values { @doc(" ") int32, string }',
    '@versioned(Widgets.Versions) namespace Widgets; @doc(" ") enum Versions { @doc(" ") v1: "2026-01-01" }',
  ])("checks explicit blanks beyond missing-doc requirements: %s", async (code) => {
    await tester
      .expect(code)
      .toEmitDiagnostics(code.includes("enum Versions") ? [diagnostic, diagnostic] : [diagnostic]);
  });

  it("preserves the uninstantiated template exemption when the compiler exposes no doc metadata", async () => {
    await tester.expect('@doc(" ") model Template<T> {}').toBeValid();
  });

  it("does not treat names or placeholders as blank documentation", async () => {
    await tester.expect('@doc("Widget") model Widget {}').toBeValid();
    await tester.expect('@doc("description") model Widget {}').toBeValid();
  });

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
