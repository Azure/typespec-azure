import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { recordTypeRule } from "../../src/rules/record-types.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: Record type rules", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, recordTypeRule, "@azure-tools/typespec-azure-core");
  });

  describe("model is Record<T>", () => {
    it("valid for string with no properties", async () => {
      await tester.expect(`model Foo is Record<string>;`).toBeValid();
    });

    it("emit warning if unknown", async () => {
      await tester.expect(`model Foo is Record<unknown>;`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/bad-record-type",
        message: `Foo should not use 'is Record<unknown>'. Use 'is Record<string>' instead.`,
      });
    });

    it("emit warning if string but has properties", async () => {
      await tester
        .expect(
          `
          model Foo is Record<string> {
              name: string;
          }
        `
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/bad-record-type",
          message: `Foo that uses 'is Record<string>' should not have properties.`,
        });
    });
  });

  describe("models extends Record<T>", () => {
    it("valid for string with no properties", async () => {
      await tester.expect(`model Foo extends Record<string> {}`).toBeValid();
    });

    it("emit warning if unknown with long inheritance chain", async () => {
      await tester
        .expect(
          `
        model Foo extends Record<unknown> {};
        model Bar extends Foo {};
        model Baz extends Bar {};
        `
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/bad-record-type",
          message: `Foo should not use 'extends Record<unknown>'. Use 'extends Record<string>' instead.`,
        });
    });

    it("emit warning if string but has properties", async () => {
      await tester
        .expect(
          `model Foo extends Record<string> {
        name: string;
      }`
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/bad-record-type",
          message: `Foo that uses 'extends Record<string>' should not have properties.`,
        });
    });
  });

  describe("models properties of type Record<T>", () => {
    it("valid for string", async () => {
      await tester
        .expect(
          `model Foo {
        props: Record<string>;
      }`
        )
        .toBeValid();
    });

    it("emit warning if unknown", async () => {
      await tester
        .expect(
          `model Foo {
        props: Record<unknown>;
      }`
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/bad-record-type",
          message: `Foo.props should not use ': Record<unknown>'. Use ': Record<string>' instead.`,
        });
    });
  });
});
