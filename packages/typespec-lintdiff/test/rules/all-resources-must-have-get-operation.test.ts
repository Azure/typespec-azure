import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import { allResourcesMustHaveGetOperationRule } from "../../src/rules/all-resources-must-have-get-operation.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "Azure.ResourceManager");

const service = `
  @armProviderNamespace @service namespace Microsoft.Contoso;
  model Widget is TrackedResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;

const diagnostic = (name = "Widget") => ({
  code: "tsp-lintdiff-local-linter/all-resources-must-have-get-operation",
  message: `Resource '${name}' must have a get/read operation.`,
});

const FullLinterTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "tsp-lintdiff-local-linter",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "Azure.ResourceManager");

async function createRuleTester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    allResourcesMustHaveGetOperationRule,
    "tsp-lintdiff-local-linter",
  );
}

describe("all-resources-must-have-get-operation native semantics", () => {
  it.each([0, 1])("validates documentation example %s", async (index) => {
    const documentation = await readFile(
      new URL("../fixtures/AllResourcesMustHaveGetOperation/rule.md", import.meta.url),
      "utf8",
    );
    const snippets = [...documentation.matchAll(/```typespec\r?\n([\s\S]*?)```/g)];
    const snippet = snippets[index]?.[1];
    if (!snippet) throw new Error("Missing native documentation example.");
    const tester = await createRuleTester();
    const expectation = tester.expect(`${service}\n${snippet}`);
    if (index === 0) await expectation.toEmitDiagnostics(diagnostic());
    else await expectation.toBeValid();
  });

  it.each([
    "createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;",
    "update is ArmResourcePatchSync<Widget, {}>;",
    `createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
     update is ArmResourcePatchSync<Widget, {}>;`,
  ])("reports one interface diagnostic for missing read: %s", async (operations) => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `${service}
        /*target*/@armResourceOperations interface Widgets {
          ${operations}
        }
      `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
  });

  it("accepts a read operation alongside both write operations", async () => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `${service}
        @armResourceOperations interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
          update is ArmResourcePatchSync<Widget, {}>;
          get is ArmResourceRead<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("does not require read for delete-only resources", async () => {
    const tester = await createRuleTester();
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
    const tester = await createRuleTester();
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

  it("reports each resource once even when write operations share an interface", async () => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `${service}
        model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
        @armResourceOperations interface Resources {
          createWidget is ArmResourceCreateOrReplaceSync<Widget>;
          updateWidget is ArmResourcePatchSync<Widget, {}>;
          createOther is ArmResourceCreateOrReplaceSync<Other>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic(), diagnostic("Other")]);
  });

  it.each([
    "createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;",
    "update is ArmResourcePatchSync<Widget, {}>;",
    `createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
     update is ArmResourcePatchSync<Widget, {}>;`,
  ])("targets writes when delete is registered first: %s", async (operations) => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `${service}
        @armResourceOperations interface Deletes {
          delete is ArmResourceDeleteSync<Widget>;
        }
        /*target*/@armResourceOperations interface Writes {
          ${operations}
        }
      `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
  });

  it("prefers createOrUpdate over update on separate interfaces", async () => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `${service}
        @armResourceOperations interface Updates {
          update is ArmResourcePatchSync<Widget, {}>;
        }
        /*target*/@armResourceOperations interface Creates {
          createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        }
      `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
  });

  it.each([
    "createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;",
    "update is ArmResourcePatchSync<Widget, {}>;",
  ])("applies suppression to the write interface, not delete: %s", async (operations) => {
    for (const suppressOn of [undefined, "Writes", "Deletes"]) {
      const suppression = (name: string) =>
        suppressOn === name
          ? `#suppress "${diagnostic().code}" "Missing read is intentional for this test."`
          : "";
      const diagnostics = await FullLinterTester.diagnose(
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
  });
});
