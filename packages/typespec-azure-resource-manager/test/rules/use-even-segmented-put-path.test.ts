import { Tester } from "#test/tester.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { useEvenSegmentedPutPathRule } from "../../src/rules/use-even-segmented-put-path.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useEvenSegmentedPutPathRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function diagnostic(path: string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/use-even-segmented-put-path",
    severity: "warning" as const,
    message: `ARM PUT path '${path}' must end in repeated /{resourceType}/{resourceName} or /{resourceType}/default pairs after the provider namespace.`,
  };
}

it("rejects a provider-root PUT and targets the operation", async () => {
  await tester
    .expect(
      `
      /*target*/@route("/providers/Microsoft.Contoso")
      @put op create(): void;
    `,
    )
    .toEmitDiagnostics((x) => ({
      ...diagnostic("/providers/Microsoft.Contoso"),
      pos: x.pos.target.pos,
    }));
});

it("rejects a collection-level PUT", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Contoso/widgets")
      @put op create(): void;
    `,
    )
    .toEmitDiagnostics(diagnostic("/providers/Microsoft.Contoso/widgets"));
});

it("rejects an odd suffix after a resource instance", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Contoso/widgets/{widgetName}/config")
      @put op create(@path widgetName: string): void;
    `,
    )
    .toEmitDiagnostics(diagnostic("/providers/Microsoft.Contoso/widgets/{widgetName}/config"));
});

it("accepts standard ARM create-or-update templates", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }
      @armResourceOperations
      interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("accepts a singleton default resource", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Contoso/widgets/default")
      @put op create(): void;
    `,
    )
    .toBeValid();
});

it("accepts nested resource type and name pairs", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Contoso/widgets/{widgetName}/configs/{configName}")
      @put op create(@path widgetName: string, @path configName: string): void;
    `,
    )
    .toBeValid();
});

it("accepts a scope-prefixed resource path", async () => {
  await tester
    .expect(
      `
      @route("/{scope}/providers/Microsoft.Contoso/widgets/{widgetName}")
      @put op create(@path scope: string, @path widgetName: string): void;
    `,
    )
    .toBeValid();
});

it("checks ordinary and nested namespaces without provider decorators", async () => {
  await tester
    .expect(
      `
      namespace Contoso {
        @route("/providers/Microsoft.Contoso")
        @put op create(): void;
        namespace Nested {
          interface Widgets {
            @route("/providers/Microsoft.Contoso/widgets")
            @put create(): void;
          }
        }
      }
    `,
    )
    .toEmitDiagnostics([
      diagnostic("/providers/Microsoft.Contoso"),
      diagnostic("/providers/Microsoft.Contoso/widgets"),
    ]);
});

it("ignores non-PUT operations", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Contoso/widgets")
      @post op create(): void;
      @route("/providers/Microsoft.Contoso")
      @get op read(): void;
    `,
    )
    .toBeValid();
});

it("ignores operations in uninstantiated template interfaces", async () => {
  await tester
    .expect(
      `
      interface Operations<T> {
        @route("/providers/Microsoft.Contoso")
        @put create(@body body: T): void;
      }
    `,
    )
    .toBeValid();
});

it("ignores operation template instances while checking project declarations", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Contoso/widgets/default")
      @put op Template<T>(@body body: T): void;
      alias Instance = Template<string>;
      @route("/providers/Microsoft.Contoso")
      @put op create(): void;
    `,
    )
    .toEmitDiagnostics(diagnostic("/providers/Microsoft.Contoso"));
});

it("ignores imported library operations while checking project declarations", async () => {
  const runner = await Tester.files({
    "node_modules/path-library/package.json": JSON.stringify({
      name: "path-library",
      exports: { ".": { typespec: "./main.tsp" } },
    }),
    "node_modules/path-library/main.tsp": `
      import "@typespec/http";
      namespace Azure.Core.PathLibrary {
        @TypeSpec.Http.route("/providers/Microsoft.Library")
        @TypeSpec.Http.put op coreCreate(): void;
      }
      namespace Azure.ResourceManager.PathLibrary {
        @TypeSpec.Http.route("/providers/Microsoft.Library")
        @TypeSpec.Http.put op armCreate(): void;
      }
    `,
  })
    .import("path-library")
    .createInstance();
  const libraryTester = createLinterRuleTester(
    runner,
    useEvenSegmentedPutPathRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await libraryTester
    .expect(
      `
      @route("/providers/Microsoft.Contoso")
      @put op create(): void;
    `,
    )
    .toEmitDiagnostics(diagnostic("/providers/Microsoft.Contoso"));
});
