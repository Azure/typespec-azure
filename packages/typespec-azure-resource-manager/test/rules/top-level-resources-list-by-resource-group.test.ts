import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { topLevelResourcesListByResourceGroupRule } from "../../src/rules/top-level-resources-list-by-resource-group.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    topLevelResourcesListByResourceGroupRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = "@armProviderNamespace @service namespace Microsoft.Contoso;";
const widget = "model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }";
const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/top-level-resources-list-by-resource-group",
  message: "Top-level resource 'Widget' should define a list by resource group operation.",
};

it.each(["TrackedResource", "ProxyResource"])(
  "requires a resource-group list for a top-level %s",
  async (kind) => {
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

it("does not infer resource identities from PATCH-only operations", async () => {
  await tester
    .expect(
      `
      ${service} ${widget}
      @armResourceOperations interface Widgets {
        update is ArmResourcePatchSync<Widget, {}>;
      }
    `,
    )
    .toBeValid();
});

it("does not require a list for an unused resource model", async () => {
  await tester.expect(`${service} ${widget}`).toBeValid();
});

it("uses the operation's customized subscription scope", async () => {
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

it.each([false, true])(
  "checks mixed resource-group and subscription routes (list=%s)",
  async (hasList) => {
    const expectation = tester.expect(`
    ${service}
    /*target*/${widget}
    @armResourceOperations interface Widgets {
      getByResourceGroup is ArmResourceRead<Widget>;
      getBySubscription is ArmResourceRead<Widget, BaseParameters = Foundations.SubscriptionBaseParameters>;
      ${hasList ? "listByResourceGroup is ArmResourceListByParent<Widget>;" : ""}
      listBySubscription is ArmListBySubscription<Widget>;
    }
  `);
    if (hasList) await expectation.toBeValid();
    else await expectation.toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
  },
);

it("does not require a list for an action-only resource", async () => {
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
