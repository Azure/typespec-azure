import { Tester } from "#test/tester.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";

import { beforeEach, it } from "vitest";
import { useResourcePathForPutRule } from "../../src/rules/use-resource-path-for-put.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useResourcePathForPutRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function diagnostic(path: string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/use-resource-path-for-put",
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

it("validates the standard ARM template examples", async () => {
  const examples = [
    `@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<
    Widget,
    Parameters = {
      @path configurationName: string;
    }
  >;
}
`,
    `@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
`,
  ];

  await tester.expect(examples[0]).toEmitDiagnostics((result) => {
    const main = [...result.program.sourceFiles.values()].find((file) =>
      file.file.text.includes("createOrUpdate is ArmResourceCreateOrReplaceSync"),
    );
    const pos = main?.file.text.indexOf("createOrUpdate is ArmResourceCreateOrReplaceSync");
    if (!main || pos === undefined || pos < 0) {
      throw new Error("The standard createOrUpdate operation was not compiled");
    }
    return {
      ...diagnostic(
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}/{configurationName}",
      ),
      file: main.file.path,
      pos,
    };
  });
  await tester.expect(examples[1]).toBeValid();
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

it("ignores operation template instances while checking project declarations", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Template")
      @put op Template<T>(@body body: T): void;
      alias Instance = Template<string>;
      @route("/providers/Microsoft.Contoso")
      @put op create(): void;
    `,
    )
    .toEmitDiagnostics(diagnostic("/providers/Microsoft.Contoso"));
});
