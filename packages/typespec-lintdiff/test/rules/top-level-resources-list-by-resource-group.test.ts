import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { it } from "vitest";
import { topLevelResourcesListByResourceGroupRule } from "../../src/rules/top-level-resources-list-by-resource-group.js";

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

async function createRuleTester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    topLevelResourcesListByResourceGroupRule,
    "tsp-lintdiff-local-linter",
  );
}

const service = "@armProviderNamespace @service namespace Microsoft.Contoso;";
const widget = "model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }";
const diagnostic = {
  code: "tsp-lintdiff-local-linter/top-level-resources-list-by-resource-group",
  message: "Top-level resource 'Widget' should define a list by resource group operation.",
};

it.each(["TrackedResource", "ProxyResource"])(
  "requires a resource-group list for a top-level %s",
  async (kind) => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `
        ${service}
        /*target*/model Widget is ${kind}<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets {
          get is ArmResourceRead<Widget>;
          listBySubscription is ArmListBySubscription<Widget>;
        }
      `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
  },
);

it("accepts a resource-group list through the standard parent template", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service} ${widget}
      @armResourceOperations interface Widgets {
        get is ArmResourceRead<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("requires a list when PATCH is the only instance operation", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service}
      /*target*/${widget}
      @armResourceOperations interface Widgets {
        update is ArmResourcePatchSync<Widget, {}>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
});

it("accepts a PATCH-only resource with a resource-group list", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service} ${widget}
      @armResourceOperations interface Widgets {
        update is ArmResourcePatchSync<Widget, {}>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("does not require a list for a model without instance operations", async () => {
  const tester = await createRuleTester();
  await tester.expect(`${service} ${widget}`).toBeValid();
});

it("uses the operation's customized subscription scope", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service} ${widget}
      @armResourceOperations interface Widgets {
        get is ArmResourceRead<Widget, BaseParameters = Foundations.SubscriptionBaseParameters>;
        list is ArmResourceListByParent<Widget, BaseParameters = Foundations.SubscriptionBaseParameters>;
      }
    `,
    )
    .toBeValid();
});

it("checks resource-group endpoints even when a subscription read is declared last", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service}
      /*target*/${widget}
      @armResourceOperations interface Widgets {
        getByResourceGroup is ArmResourceRead<Widget>;
        getBySubscription is ArmResourceRead<Widget, BaseParameters = Foundations.SubscriptionBaseParameters>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
});

it("accepts a resource with lists at both resource-group and subscription scopes", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service} ${widget}
      @armResourceOperations interface Widgets {
        getByResourceGroup is ArmResourceRead<Widget>;
        getBySubscription is ArmResourceRead<Widget, BaseParameters = Foundations.SubscriptionBaseParameters>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("does not require a list for an action-only resource", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service} ${widget}
      @armResourceOperations interface Widgets {
        run is ArmResourceActionSync<Widget, void, ArmNoContentResponse>;
      }
    `,
    )
    .toBeValid();
});

it.each([false, true])(
  "recognizes custom resource-group parameter names and path casing (list=%s)",
  async (hasList) => {
    const tester = await createRuleTester();
    const expectation = tester.expect(`
      ${service}
      /*target*/${widget}
      model Scope {
        ...CommonTypes.ApiVersionParameter;
        ...CommonTypes.SubscriptionIdParameter;
        @path @segment("resourcegroups") group: string;
      }
      @armResourceOperations interface Widgets {
        get is ArmResourceRead<Widget, BaseParameters = Scope>;
        ${hasList ? "list is ArmResourceListByParent<Widget, BaseParameters = Scope>;" : ""}
      }
    `);
    if (hasList) await expectation.toBeValid();
    else await expectation.toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
  },
);

it("does not require a resource-group list for a child resource", async () => {
  const tester = await createRuleTester();
  await tester
    .expect(
      `
      ${service}
      model Parent is TrackedResource<{}> { ...ResourceNameParameter<Parent>; }
      @parentResource(Parent)
      ${widget}
      @armResourceOperations interface Parents {
        get is ArmResourceRead<Parent>;
        list is ArmResourceListByParent<Parent>;
      }
      @armResourceOperations interface Widgets {
        get is ArmResourceRead<Widget>;
      }
    `,
    )
    .toBeValid();
});

it.each(["subscriptionResource", "tenantResource", "extensionResource"])(
  "does not require a resource-group list at %s scope",
  async (scope) => {
    const tester = await createRuleTester();
    await tester
      .expect(
        `
        ${service}
        @${scope}
        ${widget}
        @armResourceOperations interface Widgets { get is ArmResourceRead<Widget>; }
      `,
      )
      .toBeValid();
  },
);
