import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { nestedResourcesMustHaveListOperationRule } from "../../src/rules/nested-resources-must-have-list-operation.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    nestedResourcesMustHaveListOperationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = `
  @armProviderNamespace @service namespace Microsoft.Contoso;
  model WidgetProperties { label?: string; }
  model Widget is TrackedResource<WidgetProperties> { ...ResourceNameParameter<Widget>; }
  @parentResource(Widget)
  model Part is ProxyResource<WidgetProperties> { ...ResourceNameParameter<Part>; }
`;

const diagnostic = (name = "Part") => ({
  code: "@azure-tools/typespec-azure-resource-manager/NestedResourcesMustHaveListOperation",
  message: `The nested resource "${name}" does not have list operation, please add it.`,
});

it("reports an instance-only child on its authored interface", async () => {
  await tester
    .expect(
      `${service}
      /*target*/@armResourceOperations interface Parts
        extends ResourceInstanceOperations<Part, WidgetProperties> {}
    `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

it("accepts a child with the standard parent list", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts
        extends ResourceInstanceOperations<Part, WidgetProperties> {
        listByParent is ArmResourceListByParent<Part>;
      }
    `,
    )
    .toBeValid();
});

it.each(["resource-group", "subscription"])(
  "does not report nested-resource diagnostics for a top-level %s resource without lists",
  async (scope) => {
    await tester
      .expect(
        `
        @armProviderNamespace @service namespace Microsoft.Contoso;
        model WidgetProperties { label?: string; }
        model Widget is TrackedResource<WidgetProperties> { ...ResourceNameParameter<Widget>; }
        ${scope === "subscription" ? "@@subscriptionResource(Widget);" : ""}
        @armResourceOperations interface Widgets {
          get is ArmResourceRead<Widget>;
        }
      `,
      )
      .toBeValid();
  },
);

it("does not report unused nested resource declarations", async () => {
  await tester.expect(service).toBeValid();
});

it("does not let a parent or unrelated list satisfy the child", async () => {
  await tester
    .expect(
      `${service}
      model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
      @armResourceOperations interface Resources {
        get is ArmResourceRead<Part>;
        widgets is ArmResourceListByParent<Widget>;
        others is ArmResourceListByParent<Other>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("does not let a subscription-wide list replace the parent collection", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        listBySubscription is ArmListBySubscription<Part>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("checks a child of a subscription-scoped resource", async () => {
  await tester
    .expect(
      `${service}
      @@subscriptionResource(Widget);
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("reports each missing nested resource independently on a shared interface", async () => {
  await tester
    .expect(
      `${service}
      @parentResource(Part)
      model Component is ProxyResource<{}> { ...ResourceNameParameter<Component>; }
      /*target*/@armResourceOperations interface Resources {
        getPart is ArmResourceRead<Part>;
        createPart is ArmResourceCreateOrReplaceSync<Part>;
        getComponent is ArmResourceRead<Component>;
      }
    `,
    )
    .toEmitDiagnostics((x) => [
      { ...diagnostic(), pos: x.pos.target.pos },
      { ...diagnostic("Component"), pos: x.pos.target.pos },
    ]);
});

it("does not report a synthesized intermediate resource without its own operations", async () => {
  await tester
    .expect(
      `${service}
      @parentResource(Part)
      model Component is ProxyResource<{}> { ...ResourceNameParameter<Component>; }
      @armResourceOperations interface Components {
        get is ArmResourceRead<Component>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Component"));
});

it("does not let a list in another service satisfy a nested resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace("Microsoft.Contoso") @service namespace First {
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @parentResource(Widget)
        model Part is ProxyResource<{}> { ...ResourceNameParameter<Part>; }
        @armResourceOperations interface Parts {
          get is ArmResourceRead<Part>;
        }
      }
      @armProviderNamespace("Microsoft.Contoso") @service namespace Second {
        @armResourceOperations interface Parts {
          list is ArmResourceListByParent<First.Part>;
        }
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it.each([false, true])(
  "checks list coverage for each service (second service list: %s)",
  async (secondServiceList) => {
    const result = tester.expect(`
      @armProviderNamespace("Microsoft.Contoso") @service namespace First {
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @parentResource(Widget)
        model Part is ProxyResource<{}> { ...ResourceNameParameter<Part>; }
        @armResourceOperations interface Parts {
          get is ArmResourceRead<Part>;
          list is ArmResourceListByParent<Part>;
        }
      }
      @armProviderNamespace("Microsoft.Contoso") @service namespace Second {
        @armResourceOperations interface OtherParts {
          getOther is ArmResourceRead<First.Part>;
          ${secondServiceList ? "listOther is ArmResourceListByParent<First.Part>;" : ""}
        }
      }
    `);
    if (secondServiceList) {
      await result.toBeValid();
    } else {
      await result.toEmitDiagnostics(diagnostic());
    }
  },
);

// Deferred until equivalent-path resource identities share their list association:
// https://github.com/Azure/typespec-azure/issues/5899
it.skip("accepts a registered list for equivalent read and legacy PUT resource paths", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface PartsLegacy
        extends Azure.ResourceManager.Legacy.LegacyOperations<
          {
            ...ApiVersionParameter;
            ...SubscriptionIdParameter;
            ...ResourceGroupParameter;
            ...Azure.ResourceManager.Legacy.Provider;
            @path @segment("widgets") @key widgetName: string;
          },
          { @path @segment("parts") @key partName: string; }
        > {}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
        list is ArmResourceListByParent<Part>;
      }
    `,
    )
    .toBeValid();
});

it("checks a read-only singleton child", async () => {
  await tester
    .expect(
      `${service}
      @@singleton(Part);
      @armResourceOperations interface Parts { get is ArmResourceRead<Part>; }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("accepts a singleton with a parent list", async () => {
  await tester
    .expect(
      `${service}
      @@singleton(Part);
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        list is ArmResourceListByParent<Part>;
      }
    `,
    )
    .toBeValid();
});

it("does not require a list for action-only children", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        restart is ArmResourceActionSync<Part, {}, {}>;
      }
    `,
    )
    .toBeValid();
});

it.each(["tenantResource", "extensionResource"])(
  "does not require lists for children at %s scope",
  async (scope) => {
    await tester
      .expect(
        `${service}
        @@${scope}(Widget);
        @armResourceOperations interface Parts { get is ArmResourceRead<Part>; }
      `,
      )
      .toBeValid();
  },
);

it("accepts a parent list whose path parameter has a different name", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        @Azure.ResourceManager.Legacy.renamePathParameter("widgetName", "parentName")
        list is ArmResourceListByParent<Part>;
      }
    `,
    )
    .toBeValid();
});

it("checks children at location scope", async () => {
  await tester
    .expect(
      `${service}
      @@locationResource(Widget);
      @armResourceOperations interface Parts { get is ArmResourceRead<Part>; }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it.each([
  { itemType: "Part", parentRead: false },
  { itemType: "Part", parentRead: true },
  { itemType: "PartItem", parentRead: false },
  { itemType: "PartItem", parentRead: true },
])(
  "reports a missing list for a parent action returning $itemType[] (parent read: $parentRead)",
  async ({ itemType, parentRead }) => {
    await tester
      .expect(
        `${service}
        model PartItem { id: string; }
        /*target*/@armResourceOperations interface Parts {
          get is ArmResourceRead<Part>;
        }
        @armResourceOperations interface Widgets {
          ${parentRead ? "get is ArmResourceRead<Widget>;" : ""}
          @get @action("parts")
          listParts is ArmResourceActionSync<Widget, void, ArmResponse<{ value: ${itemType}[] }>>;
        }
      `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
  },
);

it("does not mistake a parent action returning a single item for a collection", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
      }
      @armResourceOperations interface Widgets {
        @get @action("parts")
        getPart is ArmResourceActionSync<Widget, void, ArmResponse<Part>>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("does not let an action overriding a Read template hide the instance read", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        list is ArmResourceListByParent<Part>;
        @post @action("reconcile")
        reconcile is ArmResourceRead<Part>;
      }
    `,
    )
    .toBeValid();
});

it("still reports a missing list when a later action overrides Read metadata", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        @post @action("reconcile")
        reconcile is ArmResourceRead<Part>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

const legacyOperations = `
  interface LegacyParts extends Azure.ResourceManager.Legacy.LegacyOperations<
    {
      ...ApiVersionParameter;
      ...SubscriptionIdParameter;
      ...ResourceGroupParameter;
      ...Azure.ResourceManager.Legacy.Provider;
      @path @segment("widgets") widgetName: string;
    },
    { @path @segment("parts") partName: string; }
  > {}
`;

it("checks legacy operations associated through REST resource metadata", async () => {
  await tester
    .expect(
      `${service}
      ${legacyOperations}
      @armResourceOperations interface Parts {
        get is LegacyParts.Read<Part>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("accepts a child with legacy read and list operations", async () => {
  await tester
    .expect(
      `${service}
      ${legacyOperations}
      @armResourceOperations interface Parts {
        get is LegacyParts.Read<Part>;
        list is LegacyParts.List<Part>;
      }
    `,
    )
    .toBeValid();
});

it("accepts a collection whose items use a separate collection representation", async () => {
  await tester
    .expect(
      `${service}
      model PartSummary { id: string; }
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
      }
      @armResourceOperations interface Widgets {
        listParts is ArmResourceListByParent<
          Part, Response = ArmResponse<{ @pageItems value: PartSummary[] }>
        >;
      }
    `,
    )
    .toBeValid();
});

it("does not check resource declarations in non-ARM services", async () => {
  await tester
    .expect(
      `
      @service namespace DataPlane;
      model Parent { @key("parentName") name: string; }
      @parentResource(Parent)
      model Child { @key("childName") name: string; }
      @route("/parents/{parentName}/children/{childName}")
      @readsResource(Child)
      op read(@path parentName: string, @path childName: string): Child;
    `,
    )
    .toBeValid();
});

it.each([
  "@pageItems items: Part[];",
  "@pageItems results: Part[];",
  "@pageItems items: Part[]; @visibility(Lifecycle.Create) value: Part[];",
  '@pageItems @encodedName("application/json", "items") value: Part[];',
])(
  "accepts a registered list without requiring a response property named value: %s",
  async (property) => {
    await tester
      .expect(
        `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
      }
      @armResourceOperations interface Widgets {
        listParts is ArmResourceListByParent<Part, Response = ArmResponse<{ ${property} }>>;
      }
    `,
      )
      .toBeValid();
  },
);

it.each([
  { method: "post", response: "ArmResponse<ResourceListResult<Part>>" },
  {
    method: "get",
    response: "{ @statusCode statusCode: 400; @body body: { @pageItems items: Part[]; }; }",
  },
])(
  "does not count a registered $method list with response $response",
  async ({ method, response }) => {
    await tester
      .expect(
        `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
        @${method}
        list is ArmResourceListByParent<Part, Response = ${response}>;
      }
    `,
      )
      .toEmitDiagnostics(diagnostic());
  },
);

it("accepts an array serialized as value with a different source property name", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Parts {
        get is ArmResourceRead<Part>;
      }
      @armResourceOperations interface Widgets {
        listParts is ArmResourceListByParent<
          Part, Response = ArmResponse<{ @pageItems @encodedName("application/json", "value") items: Part[] }>
        >;
      }
    `,
    )
    .toBeValid();
});
