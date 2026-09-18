import { getSourceLocation, resolvePath, type Operation } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, expect, it, vi } from "vitest";
import { summaryAndDescriptionMustNotBeSameRule } from "../../src/rules/summary-and-description-must-not-be-same.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [],
});

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    summaryAndDescriptionMustNotBeSameRule,
    "tsp-lintdiff-local-linter",
  );
}

const diagnostic = {
  code: "tsp-lintdiff-local-linter/summary-and-description-must-not-be-same",
  message: "The summary and description values should not be same.",
};

describe("summary-and-description-must-not-be-same", () => {
  it.each([
    ["identical text", '@summary("Read widgets") @doc("Read widgets")'],
    ["surrounding whitespace", '@summary(" Read widgets ") @doc("Read widgets")'],
    ["doc comment", '/** Read widgets */ @summary("Read widgets")'],
  ])("reports %s on operations", async (_, decorators) => {
    await (
      await tester()
    )
      .expect(`${decorators} op read(): string;`)
      .toEmitDiagnostics([diagnostic]);
  });

  it.each([
    ["different text", '@summary("Read widgets") @doc("Returns all widgets.")'],
    ["different case", '@summary("Read widgets") @doc("read widgets")'],
    ["different punctuation", '@summary("Read widgets") @doc("Read widgets.")'],
    ["summary only", '@summary("Read widgets")'],
    ["description only", '@doc("Read widgets")'],
    ["neither field", ""],
    ["both empty", '@summary("") @doc("")'],
    ["empty summary", '@summary("") @doc("Read widgets")'],
    ["empty description", '@summary("Read widgets") @doc("")'],
  ])("accepts %s", async (_, decorators) => {
    await (await tester()).expect(`${decorators} op read(): string;`).toBeValid();
  });

  it("checks the alias and its instantiated source operation at distinct locations", async () => {
    await (
      await tester()
    )
      .expect(
        `
        @summary("Read widgets") @doc("Read widgets")
        op ReadWidgets<T>(): T;
        op /*read*/read is ReadWidgets<string>;
      `,
      )
      .toEmitDiagnostics(({ read }) => {
        const alias = read as Operation;
        const source = alias.sourceOperation!;
        expect(alias.name).toBe("read");
        expect(source.name).toBe("ReadWidgets");
        expect(source).not.toBe(alias);
        expect(getSourceLocation(source).pos).not.toBe(getSourceLocation(alias).pos);
        return [alias, source].map((target) => ({
          ...diagnostic,
          file: getSourceLocation(target).file.path,
          pos: getSourceLocation(target).pos,
          end: getSourceLocation(target).end,
        }));
      });
  });

  it("checks inherited interface operations inside nested namespaces", async () => {
    await (
      await tester()
    )
      .expect(
        `
        interface ReadOperations<T> {
          @summary("Read widgets") @doc("Read widgets")
          read(): T;
        }
        namespace Service.Nested {
          interface Widgets extends ReadOperations<string> {}
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("does not compare model or property documentation", async () => {
    await (
      await tester()
    )
      .expect(
        `
        @summary("Widget") @doc("Widget")
        model Widget {
          @summary("Name") @doc("Name")
          name: string;
        }
      `,
      )
      .toBeValid();
  });
});
