import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import assert from "assert";
import { beforeEach, describe, it } from "vitest";
import { casingRule } from "../../src/rules/casing-style.js";
import { isCamelCaseNoAcronyms, isPascalCaseNoAcronyms } from "../../src/rules/utils.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: casing rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, casingRule, "@azure-tools/typespec-azure-core");
  });

  describe("utils", () => {
    it("isPascalCaseNoAcronyms works as expected", () => {
      ["", "A", "PascalCase", "PascalCase123", "SignalR", "VmResource", "Rp"].forEach((name) =>
        assert.ok(isPascalCaseNoAcronyms(name), `${name} should be PascalCase`),
      );
      ["a", "foo", "fooBar", "foo_bar", "foo-bar", "VMResource", "RP"].forEach((name) => {
        assert.ok(!isPascalCaseNoAcronyms(name), `${name} should not be PascalCase`);
      });
    });

    it("isCamelCaseNoAcronyms works as expected", () => {
      ["", "a", "foo", "fooBar", "office365", "signalR", "aRp", "$aRp", "_aRp"].forEach((name) =>
        assert.ok(isCamelCaseNoAcronyms(name), `${name} should be camelCase`),
      );
      ["Foo", "123", "foo.bar", "foo-bar", "foo_bar", "aRP", "$aRP", "_ARp"].forEach((name) =>
        assert.ok(!isCamelCaseNoAcronyms(name), `${name} should not be camelCase`),
      );
    });
  });

  describe("model name must be PascalCase", () => {
    it("is valid", async () => {
      await tester.expect(`model FooProperties {}`).toBeValid();
    });

    it("emit warnings if not PascalCase", async () => {
      await tester.expect(`model fooProperties {}`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/casing-style",
        message: `The names of Model types must use PascalCase`,
      });
    });
  });

  describe("namespace name must be PascalCase", () => {
    it("is valid", async () => {
      await tester.expect(`namespace Models {}`).toBeValid();
    });

    it("is valid if contains .", async () => {
      await tester.expect(`namespace Microsoft.FooBar {}`).toBeValid();
    });

    it("emit warnings if not PascalCase", async () => {
      await tester.expect(`namespace models {}`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/casing-style",
        message: `The names of Namespace types must use PascalCase`,
      });
    });
  });

  describe("interface name must be PascalCase", () => {
    it("is valid", async () => {
      await tester.expect(`interface StoreFront {}`).toBeValid();
    });

    it("emit warnings if not PascalCase", async () => {
      await tester.expect(`interface storeFront {}`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/casing-style",
        message: `The names of Interface types must use PascalCase`,
      });
    });
  });

  describe("operation name must be camelCase", () => {
    it("is valid", async () => {
      await tester.expect(`op myOperation(): void;`).toBeValid();
    });

    it("emit warnings if not camelCase", async () => {
      await tester.expect(`op MyOperation(): void;`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/casing-style",
        message: `The names of Operation types must use camelCase`,
      });
    });
  });

  describe("operation template must be PascalCase", () => {
    it("is valid", async () => {
      await tester.expect(`op MyOperation<T>(): T; op myOp is MyOperation<string>;`).toBeValid();
    });

    it("emit warnings if not PascalCase", async () => {
      await tester
        .expect(`op myOperation<T>(): T; op myOp is myOperation<string>;`)
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/casing-style",
          message: `The names of Operation Template types must use PascalCase`,
        });
    });
  });

  describe("model property name must be camelCase", () => {
    it("is valid", async () => {
      await tester.expect(`model User {firstName: string, age: int32}`).toBeValid();
    });

    it("emit warnings if not camelCase", async () => {
      await tester.expect(`model User {FirstName: string}`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/casing-style",
        message: `The names of Property types must use camelCase`,
      });
    });
  });
});
