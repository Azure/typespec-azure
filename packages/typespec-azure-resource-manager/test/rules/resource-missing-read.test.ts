import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, it } from "vitest";
import { resourceMissingReadRule } from "../../src/rules/resource-missing-read.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    resourceMissingReadRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = `
  @armProviderNamespace @service namespace Microsoft.Contoso;
  model WidgetProperties { label?: string; }
  model Widget is TrackedResource<WidgetProperties> {
    ...ResourceNameParameter<Widget>;
  }
`;

const diagnostic = (name = "Widget") => ({
  code: "@azure-tools/typespec-azure-resource-manager/resource-missing-read",
  message: `Resource '${name}' must have a get/read operation.`,
});

async function documentationExample(index: number) {
  const documentation = await readFile(
    new URL("../../src/rules/resource-missing-read.md", import.meta.url),
    "utf8",
  );
  const snippet = [...documentation.matchAll(/```typespec\r?\n([\s\S]*?)```/g)][index]?.[1];
  if (!snippet) throw new Error("Missing native documentation example.");
  return `${service}\n${snippet}`;
}

it("reports on the incorrect documentation example", async () => {
  await tester.expect(await documentationExample(0)).toEmitDiagnostics(diagnostic());
});

it("accepts the correct documentation example", async () => {
  await tester.expect(await documentationExample(1)).toBeValid();
});

it("reports a missing read for a create operation on its interface", async () => {
  await tester
    .expect(
      `${service}
      /*target*/@armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

it("reports a missing read for an update-only resource", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("reports once when both create and update lack a read", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("accepts a read alongside create and update operations", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        get is ArmResourceRead<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("does not require a read for a delete-only resource", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        delete is ArmResourceDeleteSync<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("does not treat a collection list as a resource read", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        list is ArmResourceListByParent<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("reports each resource once when writes share an interface", async () => {
  await tester
    .expect(
      `${service}
      model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
      @armResourceOperations interface Resources {
        createWidget is ArmResourceCreateOrReplaceSync<Widget>;
        updateWidget is ArmResourcePatchSync<Widget, WidgetProperties>;
        createOther is ArmResourceCreateOrReplaceSync<Other>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic(), diagnostic("Other")]);
});

it("requires a read for a nested resource independently of its parent", async () => {
  await tester
    .expect(
      `${service}
      @parentResource(Widget)
      model WidgetPart is ProxyResource<{}> { ...ResourceNameParameter<WidgetPart>; }
      @armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        get is ArmResourceRead<Widget>;
      }
      /*target*/@armResourceOperations interface WidgetParts {
        createOrUpdate is ArmResourceCreateOrReplaceSync<WidgetPart>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic("WidgetPart"), pos: x.pos.target.pos }));
});

it("targets create writes when delete is registered first", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Deletes {
        delete is ArmResourceDeleteSync<Widget>;
      }
      /*target*/@armResourceOperations interface Writes {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

it("targets update writes when delete is registered first", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Deletes {
        delete is ArmResourceDeleteSync<Widget>;
      }
      /*target*/@armResourceOperations interface Writes {
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

it("targets shared writes when delete is registered first", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Deletes {
        delete is ArmResourceDeleteSync<Widget>;
      }
      /*target*/@armResourceOperations interface Writes {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

it("prefers createOrUpdate over update on separate interfaces", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Updates {
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
      /*target*/@armResourceOperations interface Creates {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

async function expectWriteSuppression(operations: string) {
  for (const suppressOn of [undefined, "Writes", "Deletes"]) {
    const suppression = (name: string) =>
      suppressOn === name
        ? `#suppress "${diagnostic().code}" "Missing read is intentional for this test."`
        : "";
    const diagnostics = await Tester.diagnose(
      `${service}
      ${suppression("Deletes")}
      @armResourceOperations interface Deletes {
        delete is ArmResourceDeleteSync<Widget>;
      }
      ${suppression("Writes")}
      @armResourceOperations interface Writes {
        ${operations}
      }
    `,
      {
        compilerOptions: {
          linterRuleSet: { enable: { [diagnostic().code]: true } },
        },
      },
    );
    expectDiagnostics(diagnostics, suppressOn === "Writes" ? [] : [diagnostic()]);
  }
}

it("applies create suppression to the write interface, not delete", async () => {
  await expectWriteSuppression("createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;");
});

it("applies update suppression to the write interface, not delete", async () => {
  await expectWriteSuppression("update is ArmResourcePatchSync<Widget, WidgetProperties>;");
});
