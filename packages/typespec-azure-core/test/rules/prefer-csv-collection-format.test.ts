import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { preferCsvCollectionFormatRule } from "../../src/rules/prefer-csv-collection-format.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: prefer-csv-collection-format rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      preferCsvCollectionFormatRule,
      "@azure-tools/typespec-azure-core",
    );
  });

  it("emit warning if  using another format for a header ", async () => {
    await tester
      .expect(`op foo(@header({format: "tsv"}) select: string[]): void;`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/prefer-csv-collection-format",
      });
  });

  it("is ok if header param doesn't need format", async () => {
    await tester.expect(`op foo(@header filter: string): void;`).toBeValid();
  });
});
