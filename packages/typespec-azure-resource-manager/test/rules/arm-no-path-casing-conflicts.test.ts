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

it("emits a diagnostic when paths differ only by path parameter name casing", async () => {
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
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-path-casing-conflicts",
      message:
        "Operation path '/providers/Microsoft.Contoso/foos/{resourceName}' differs from operation path '/providers/Microsoft.Contoso/foos/{ResourceName}' only by character casing. Each ARM operation path must be unique case-insensitively.",
    });
});

it("buckets paths with different parameter names separately (no diagnostic)", async () => {
  // /{resourceUri}/... and /{scope}/... have different parameter names, so
  // they belong to different buckets and must not collide.
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/{resourceUri}/providers/Microsoft.Foo/widgets")
      @get op listByResourceUri(@path resourceUri: string): void;

      @route("/{scope}/providers/microsoft.foo/widgets")
      @get op listByScope(@path scope: string): void;
      `,
    )
    .toBeValid();
});

it("buckets paths whose parameter names match case-insensitively together (diagnostic)", async () => {
  // /{scope}/... and /{Scope}/... share a bucket and differ only by casing.
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/{scope}/providers/microsoft.foo/widgets")
      @get op listLower(@path scope: string): void;

      @route("/{Scope}/providers/Microsoft.Foo/widgets")
      @post op listUpper(@path Scope: string): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-path-casing-conflicts",
      message:
        "Operation path '/{Scope}/providers/Microsoft.Foo/widgets' differs from operation path '/{scope}/providers/microsoft.foo/widgets' only by character casing. Each ARM operation path must be unique case-insensitively.",
    });
});

it("emits a diagnostic for two @route operations (delete and get) that differ only by static-segment casing", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/foos/{name}")
      @delete op deleteFoo(@path name: string): void;

      @route("/providers/Microsoft.Contoso/Foos/{name}")
      @get op getFoo(@path name: string): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-path-casing-conflicts",
      message:
        "Operation path '/providers/Microsoft.Contoso/Foos/{name}' differs from operation path '/providers/Microsoft.Contoso/foos/{name}' only by character casing. Each ARM operation path must be unique case-insensitively.",
    });
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
