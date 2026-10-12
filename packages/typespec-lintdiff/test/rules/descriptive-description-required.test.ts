import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { descriptiveDescriptionRequiredRule } from "../../src/rules/descriptive-description-required.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), { libraries: [] });
let tester: ReturnType<typeof createLinterRuleTester>;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    descriptiveDescriptionRequiredRule,
    "tsp-lintdiff-local-linter",
  );
});

const diagnostic = {
  code: "tsp-lintdiff-local-linter/descriptive-description-required",
  message: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
};

describe("descriptive-description-required", () => {
  it.each([
    '@doc(" ") namespace Widgets {}',
    '@doc(" ") interface Widgets {}',
    '@doc(" ") op read(): string;',
    '@doc(" ") model Widget {}',
    'model Widget { @doc(" ") name: string; }',
    '@doc(" ") scalar Label extends string;',
    '@doc(" ") enum State { Ready }',
    'enum State { @doc(" ") Ready }',
    '@doc(" ") union State { ready: "ready", string }',
    'union State { @doc(" ") ready: "ready", string }',
    'op read(@doc(" ") name: string): string;',
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
});
