import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
  extractCursor,
} from "@typespec/compiler/testing";
import { requireDocumentation } from "../../src/rules/require-docs.js";
import { createAzureCoreTestRunner, getRunnerPosOffset } from "../test-host.js";

describe("typespec-azure-core: documentation-required rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(
      runner,
      requireDocumentation,
      "@azure-tools/typespec-azure-core"
    );
  });

  async function checkDocRequired(code: string, message: string) {
    const { pos, source } = extractCursor(code);
    await tester.expect(source).toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/documentation-required",
        message,
        pos: getRunnerPosOffset(pos),
      },
    ]);
  }

  describe("emit `documentation-required` when documentation is missing", () => {
    it("on model", async () =>
      await checkDocRequired(
        "┆model Foo {}",
        "The Model named 'Foo' should have a documentation or description, please use decorator @doc to add it."
      ));

    it("on model property", async () =>
      await checkDocRequired(
        `@doc("Abc") model Foo {
          ┆x: string;
        }`,
        "The ModelProperty named 'x' should have a documentation or description, please use decorator @doc to add it."
      ));

    it("on operation", async () =>
      await checkDocRequired(
        `┆op read(): void;`,
        "The Operation named 'read' should have a documentation or description, please use decorator @doc to add it."
      ));

    it("on property", async () =>
      await checkDocRequired(
        `@doc("op doc") op read(┆param1: string): void;`,
        "The ModelProperty named 'param1' should have a documentation or description, please use decorator @doc to add it."
      ));

    it("on enum", async () => {
      await checkDocRequired(
        "┆enum Foo {}",
        "The Enum named 'Foo' should have a documentation or description, please use decorator @doc to add it."
      );
    });

    it("on enum member", async () => {
      await checkDocRequired(
        `@doc(".") enum Foo {
          ┆Bar,
        }`,
        "The EnumMember named 'Bar' should have a documentation or description, please use decorator @doc to add it."
      );
    });
  });
});
