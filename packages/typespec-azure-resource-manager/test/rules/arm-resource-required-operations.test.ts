import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceRequiredOperationsRule } from "../../src/rules/arm-resource-required-operations.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceRequiredOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("is valid when tracked resource has the complete set of required operations", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listByResourceGroup is ArmResourceListByParent<Foo>;
        listBySubscription is ArmListBySubscription<Foo>;
      }
      `,
    )
    .toBeValid();
});

it("emits missingDelete when only the delete operation is missing", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        listByResourceGroup is ArmResourceListByParent<Foo>;
        listBySubscription is ArmListBySubscription<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Resource 'Foo' must have a delete operation.`,
    });
});

it("emits missingGet when only read is missing", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listByResourceGroup is ArmResourceListByParent<Foo>;
        listBySubscription is ArmListBySubscription<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Resource 'Foo' must have a GET (read) operation.`,
    });
});

it("emits a single default diagnostic listing all missing operations when multiple are missing", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message:
        "Resource 'Foo' is missing required operations: [read, delete, list-by-parent, list-by-subscription].",
    });
});

it("emits missingListByParent for a tracked resource without a list-by-resource-group operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listBySubscription is ArmListBySubscription<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Resource 'Foo' must have a list-by-parent operation (list-by-resource-group satisfies this for tracked resources).`,
    });
});

it("emits missingListBySubscription for a tracked resource without a list-by-subscription operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listByResourceGroup is ArmResourceListByParent<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Tracked resource 'Foo' must have a list-by-subscription operation.`,
    });
});

it("emits missingListByParent for a nested proxy resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") fooName: string;
      }

      @parentResource(Foo)
      model Bar is ProxyResource<{}> {
        @key @path @segment("bars") barName: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listByResourceGroup is ArmResourceListByParent<Foo>;
        listBySubscription is ArmListBySubscription<Foo>;
      }

      @armResourceOperations
      interface BarOperations {
        read is ArmResourceRead<Bar>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Bar>;
        delete is ArmResourceDeleteWithoutOkAsync<Bar>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Resource 'Bar' must have a list-by-parent operation (list-by-resource-group satisfies this for tracked resources).`,
    });
});

it("does not emit missingDelete or missingList for a singleton tracked resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      @singleton
      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
      }
      `,
    )
    .toBeValid();
});

it("emits missingCreateOrUpdate when only createOrUpdate is missing", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listByResourceGroup is ArmResourceListByParent<Foo>;
        listBySubscription is ArmListBySubscription<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Resource 'Foo' must have a PUT (createOrUpdate) operation.`,
    });
});

it("emits missingGet for a singleton tracked resource missing read", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      @singleton
      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations",
      message: `Resource 'Foo' must have a GET (read) operation.`,
    });
});

it("is valid when an extension resource has read, createOrUpdate, delete, and a list operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is ExtensionResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations {
        read is ArmResourceRead<Foo>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        listByParent is ArmResourceListByParent<Foo>;
      }
      `,
    )
    .toBeValid();
});

it("skips @armVirtualResource models", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      @armVirtualResource
      model VirtualFoo {
        @key @path @segment("virtualFoos") name: string;
      }
      `,
    )
    .toBeValid();
});
