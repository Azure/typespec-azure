import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { topLevelResourcesListBySubscriptionRule } from "../../src/rules/top-level-resources-list-by-subscription.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    topLevelResourcesListBySubscriptionRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = `
  @armProviderNamespace @service namespace Microsoft.Contoso;
  model WidgetProperties { label?: string; }
  @subscriptionResource
  model Widget is ProxyResource<WidgetProperties> {
    ...ResourceNameParameter<Widget>;
  }
`;

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/top-level-resources-list-by-subscription",
  message:
    'The top-level resource "Widget" does not have list by subscription operation, please add it.',
};

it("reports a missing subscription list on the authored interface", async () => {
  await tester
    .expect(
      `${service}
      /*target*/@armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
      }
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
});

it("accepts the standard subscription list", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
        list is ArmListBySubscription<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("reports only once for multiple instance operations", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
        delete is ArmResourceDeleteSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("does not accept a list for another resource", async () => {
  await tester
    .expect(
      `${service}
      @subscriptionResource
      model Other is ProxyResource<WidgetProperties> { ...ResourceNameParameter<Other>; }
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
        listOthers is ArmListBySubscription<Other>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts a list declared in a separate interface", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets { read is ArmResourceRead<Widget>; }
      @armResourceOperations interface WidgetLists { list is ArmListBySubscription<Widget>; }
    `,
    )
    .toBeValid();
});

it("ignores unused resource declarations", async () => {
  await tester.expect(service).toBeValid();
});

it.each(["resourceGroup", "tenant"])(
  "does not require a subscription list for %s-scoped instances",
  async (scope) => {
    await tester
      .expect(
        `${service.replace("@subscriptionResource", `@${scope}Resource`)}
        @armResourceOperations interface Widgets { read is ArmResourceRead<Widget>; }
      `,
      )
      .toBeValid();
  },
);

it("ignores subscription-location resources", async () => {
  await tester
    .expect(
      `${service.replace("@subscriptionResource", "@parentResource(SubscriptionLocationResource)")}
      @armResourceOperations interface Widgets { read is ArmResourceRead<Widget>; }
    `,
    )
    .toBeValid();
});

it("ignores nested subscription resources", async () => {
  await tester
    .expect(
      `${service}
      @parentResource(Widget)
      model Part is ProxyResource<WidgetProperties> { ...ResourceNameParameter<Part>; }
      @armResourceOperations interface Parts { read is ArmResourceRead<Part>; }
    `,
    )
    .toBeValid();
});
