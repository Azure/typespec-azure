import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armNoPathCasingConflictsRule } from "../../src/rules/arm-no-path-casing-conflicts.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armNoPathCasingConflictsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits a diagnostic when two operation paths differ only by segment casing", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/foos")
      @get op listLower(): void;

      @route("/providers/Microsoft.Contoso/Foos")
      @get op listUpper(): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-path-casing-conflicts",
      message:
        "Operation path '/providers/Microsoft.Contoso/Foos' differs from operation path '/providers/Microsoft.Contoso/foos' only by character casing. Each ARM operation path must be unique case-insensitively.",
    });
});

it("does not emit when two operations share the exact same path (handled by @route duplicate check)", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/foos")
      @get op listOne(): void;

      @route("/providers/Microsoft.Contoso/foos")
      @post op listTwo(): void;
      `,
    )
    .toBeValid();
});

it("does not emit when paths do not overlap case-insensitively", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/foos")
      @get op listFoos(): void;

      @route("/providers/Microsoft.Contoso/bars")
      @get op listBars(): void;
      `,
    )
    .toBeValid();
});

it("does not emit when paths differ only by path parameter name casing", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/foos/{ResourceName}")
      @get op getOne(@path ResourceName: string): void;

      @route("/providers/Microsoft.Contoso/foos/{resourceName}")
      @post op getTwo(@path resourceName: string): void;
      `,
    )
    .toBeValid();
});

it("applies a codefix that lowercases the offending @segment value", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      model Foo is ProxyResource<FooProperties> {
        @key("name")
        @path
        @segment("foos")
        @visibility(Lifecycle.Read)
        name: string;
      }

      model Bar is ProxyResource<FooProperties> {
        @key("name")
        @path
        @segment("Foos")
        @visibility(Lifecycle.Read)
        name: string;
      }

      model FooProperties { color?: string; }

      @armResourceOperations
      interface Foos {
        get is ArmResourceRead<Foo>;
      }

      @armResourceOperations
      interface Bars {
        get is ArmResourceRead<Bar>;
      }
      `,
    )
    .applyCodeFix("arm-segment-to-lowercase").toEqual(`
      @armProviderNamespace
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      model Foo is ProxyResource<FooProperties> {
        @key("name")
        @path
        @segment("foos")
        @visibility(Lifecycle.Read)
        name: string;
      }

      model Bar is ProxyResource<FooProperties> {
        @key("name")
        @path
        @segment("foos")
        @visibility(Lifecycle.Read)
        name: string;
      }

      model FooProperties { color?: string; }

      @armResourceOperations
      interface Foos {
        get is ArmResourceRead<Foo>;
      }

      @armResourceOperations
      interface Bars {
        get is ArmResourceRead<Bar>;
      }
      `);
});

it("does not check operations from internal TypeSpec namespaces", async () => {
  // Operations in Azure.ResourceManager / TypeSpec / Azure.Core should be
  // ignored.  Define only one user-facing operation that would otherwise
  // collide with something internal — none does, so this should be valid.
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      model Foo is ProxyResource<{}> {
        @key("fooName")
        @path
        @segment("foos")
        @visibility(Lifecycle.Read)
        name: string;
      }

      @armResourceOperations
      interface Foos {
        get is ArmResourceRead<Foo>;
      }
      `,
    )
    .toBeValid();
});
