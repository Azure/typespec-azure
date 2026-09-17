import { getSourceLocation, type Operation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { noIdenticalSummaryAndDescriptionRule } from "../../src/rules/no-identical-summary-and-description.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noIdenticalSummaryAndDescriptionRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/no-identical-summary-and-description",
  message: "Use a description that adds detail beyond the operation summary.",
};

describe("no-identical-summary-and-description", () => {
  it("reports identical summary and description on the operation", async () => {
    await tester
      .expect('@summary("Read widgets") @doc("Read widgets") op /*read*/read(): string;')
      .toEmitDiagnostics(({ read }) => ({
        ...diagnostic,
        pos: getSourceLocation(read).pos,
        end: getSourceLocation(read).end,
      }));
  });

  it("reports equality after trimming surrounding whitespace", async () => {
    await tester
      .expect('@summary(" Read widgets ") @doc("Read widgets") op read(): string;')
      .toEmitDiagnostics([diagnostic]);
  });

  it("accepts different summary and description", async () => {
    await tester
      .expect('@summary("Read widgets") @doc("Returns all widgets.") op read(): string;')
      .toBeValid();
  });

  it("accepts empty summary and description", async () => {
    await tester.expect('@summary("") @doc("") op read(): string;').toBeValid();
  });

  it("accepts a summary without a description", async () => {
    await tester.expect('@summary("Read widgets") op read(): string;').toBeValid();
  });

  it("accepts a description without a summary", async () => {
    await tester.expect('@doc("Read widgets") op read(): string;').toBeValid();
  });

  it("reads descriptions from doc comments", async () => {
    await tester
      .expect('/** Read widgets */ @summary("Read widgets") op read(): string;')
      .toEmitDiagnostics([diagnostic]);
  });

  it.each([
    ["different case", '@summary("Read widgets") @doc("read widgets")'],
    ["different punctuation", '@summary("Read widgets") @doc("Read widgets.")'],
    ["neither field", ""],
    ["empty summary", '@summary("") @doc("Read widgets")'],
    ["empty description", '@summary("Read widgets") @doc("")'],
  ])("accepts %s", async (_, decorators) => {
    await tester.expect(`${decorators} op read(): string;`).toBeValid();
  });

  it("checks the alias and its instantiated source operation at distinct locations", async () => {
    await tester
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

  it("does not visit uninstantiated operation templates", async () => {
    await tester
      .expect(
        `
        @summary("Read widgets") @doc("Read widgets")
        op ReadWidgets<T>(): T;
      `,
      )
      .toBeValid();
  });

  it("checks inherited interface operations inside nested namespaces", async () => {
    await tester
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

  it("excludes violating imported library operations but reports project operations", async () => {
    const runner = await Tester.files({
      "node_modules/documented-library/package.json": JSON.stringify({
        name: "documented-library",
        exports: { ".": { typespec: "./main.tsp" } },
      }),
      "node_modules/documented-library/main.tsp": `
        namespace DocumentedLibrary;
        @summary("Read widgets") @doc("Read widgets")
        op read(): string;
      `,
    })
      .import("documented-library")
      .createInstance();
    const lint = createLinterRuleTester(
      runner,
      noIdenticalSummaryAndDescriptionRule,
      "@azure-tools/typespec-azure-core",
    );
    await lint
      .expect(
        `
        namespace Project.Nested {
          @summary("Read widgets") @doc("Read widgets")
          op /*read*/read(): string;
        }
      `,
      )
      .toEmitDiagnostics(({ read }) => ({
        ...diagnostic,
        file: getSourceLocation(read).file.path,
        pos: getSourceLocation(read).pos,
        end: getSourceLocation(read).end,
      }));
  });

  it("does not compare model or property documentation", async () => {
    await tester
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
