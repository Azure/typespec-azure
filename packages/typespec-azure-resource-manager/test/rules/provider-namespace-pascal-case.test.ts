import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";

import { beforeEach, it } from "vitest";
import { providerNamespacePascalCaseRule } from "../../src/rules/provider-namespace-pascal-case.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    providerNamespacePascalCaseRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function diagnostic(namespace: string, path: string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/provider-namespace-pascal-case",
    severity: "warning" as const,
    message: `Provider namespace '${namespace}' in path '${path}' must use PascalCase.`,
  };
}

it("reports an incorrectly cased provider namespace in a custom route", async () => {
  const path = "/providers/Microsoft.compute/widgets";
  await tester
    .expect(
      `
      @armProviderNamespace("Microsoft.Compute")
      namespace Microsoft.Compute;
      @route("${path}")
      @get op /*target*/read(): void;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic("Microsoft.compute", path),
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("checks provider namespaces in standard ARM resource paths", async () => {
  const path =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.compute/widgets/{widgetName}";
  await tester
    .expect(
      `
      @armProviderNamespace("Microsoft.compute")
      namespace Microsoft.Compute;
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }
      @armResourceOperations
      interface Widgets {
        /*target*/read is ArmResourceRead<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic("Microsoft.compute", path),
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("checks every literal provider namespace in a path", async () => {
  const path =
    "/providers/Microsoft.Contoso/parents/{parentName}/providers/Microsoft.cache/children";
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      @route("${path}")
      @get op /*target*/read(@path parentName: string): void;
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic("Microsoft.cache", path),
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports one diagnostic for operations sharing a path", async () => {
  const path = "/providers/Microsoft.cache/widgets";
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      interface Widgets {
        @route("${path}")
        @get /*target*/read(): void;
        @route("${path}")
        @put create(): void;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      ...diagnostic("Microsoft.cache", path),
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("accepts PascalCase provider namespaces with acronyms", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      @route("/providers/Microsoft.CosmosDB/widgets")
      @get op read(): void;
    `,
    )
    .toBeValid();
});

it("accepts standard ARM resource paths with PascalCase provider names", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Compute;
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }
      @armResourceOperations
      interface Widgets {
        read is ArmResourceRead<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("does not check non-ARM services", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @route("/providers/Microsoft.compute/widgets")
      @get op read(): void;
    `,
    )
    .toBeValid();
});

it("ignores ARM routes without provider namespaces", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      @route("/custom/widgets")
      @get op read(): void;
    `,
    )
    .toBeValid();
});

it("ignores provider namespace parameters", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      @route("/providers/{providerNamespace}/widgets")
      @get op read(@path providerNamespace: string): void;
    `,
    )
    .toBeValid();
});
