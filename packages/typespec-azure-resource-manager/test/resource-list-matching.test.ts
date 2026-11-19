import { unsafe_Realm } from "@typespec/compiler/experimental";
import { ok } from "node:assert";
import { describe, expect, it } from "vitest";
import { resolveArmResources } from "../src/resource.js";
import { Tester } from "./tester.js";

const resourceGroupPath =
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets";
const subscriptionPath = "/subscriptions/{subscriptionId}/providers/Microsoft.Test/widgets";

function pathParameters(path: string): string {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => `@path ${match[1]}: string`).join(", ");
}

describe("resource list matching", () => {
  it.each(["TrackedResource", "ProxyResource", "ExtensionResource"])(
    "matches only the immediate parent collection for %s",
    async (kind) => {
      const { program } = await Tester.compile(`
        @armProviderNamespace namespace Microsoft.Test;
        model Widget is ${kind}<{}> { ...ResourceNameParameter<Widget>; }
        interface Widgets {
          @route("${resourceGroupPath}/{widgetName}") @get @armResourceRead(Widget)
          op read(${pathParameters(`${resourceGroupPath}/{widgetName}`)}): Widget;
          @route("${resourceGroupPath}/{widgetName}/parts/{partName}") @get @armResourceRead(Widget)
          op readPart(${pathParameters(`${resourceGroupPath}/{widgetName}/parts/{partName}`)}): Widget;
          @route("${resourceGroupPath}") @get @armResourceList(Widget)
          op list(${pathParameters(resourceGroupPath)}): ResourceListResult<Widget>;
          @route("${resourceGroupPath}/{widgetName}/parts") @get @armResourceList(Widget)
          op listParts(${pathParameters(`${resourceGroupPath}/{widgetName}/parts`)}): ResourceListResult<Widget>;
        }
      `);
      const provider = resolveArmResources(program);
      const resources = provider.resources?.filter((r) => r.operations.lifecycle.read?.length);
      expect(resources).toHaveLength(2);
      expect(resources?.map((r) => r.operations.lists.map((op) => op.name))).toEqual([
        ["list"],
        ["listParts"],
      ]);
      expect(provider.providerOperations).toEqual([]);
    },
  );

  it.each([
    { kind: "TrackedResource", matches: true },
    { kind: "ProxyResource", matches: false },
    { kind: "ExtensionResource", matches: false },
  ])("subscription matching for $kind", async ({ kind, matches }) => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is ${kind}<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${resourceGroupPath}/{widgetName}") @get @armResourceRead(Widget)
        op read(${pathParameters(`${resourceGroupPath}/{widgetName}`)}): Widget;
        @route("${subscriptionPath}") @get @armResourceList(Widget)
        op listBySubscription(${pathParameters(subscriptionPath)}): ResourceListResult<Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    expect(provider.resources?.[0].operations.lists.map((op) => op.name)).toEqual(
      matches ? ["listBySubscription"] : [],
    );
    expect(provider.providerOperations?.map((op) => [op.name, op.kind])).toEqual(
      matches ? [] : [["listBySubscription", "list"]],
    );
  });

  it.each(["ProxyResource", "ExtensionResource"])(
    "matches a subscription identity's own parent collection for %s",
    async (kind) => {
      const { program } = await Tester.compile(`
        @armProviderNamespace namespace Microsoft.Test;
        model Widget is ${kind}<{}> { ...ResourceNameParameter<Widget>; }
        interface Widgets {
          @route("${subscriptionPath}/{widgetName}") @get @armResourceRead(Widget)
          op read(${pathParameters(`${subscriptionPath}/{widgetName}`)}): Widget;
          @route("${subscriptionPath}") @get @armResourceList(Widget)
          op list(${pathParameters(subscriptionPath)}): ResourceListResult<Widget>;
        }
      `);
      const provider = resolveArmResources(program);
      expect(provider.resources?.[0].operations.lists.map((op) => op.name)).toEqual(["list"]);
      expect(provider.providerOperations).toEqual([]);
    },
  );

  it.each([
    "/providers/Microsoft.Test/widgets",
    "/providers/Microsoft.Management/managementGroups/{group}/providers/Microsoft.Test/widgets",
    "/subscriptions/{subscription}/providers/Microsoft.Other/widgets",
    "/subscriptions/{subscription}/providers/Microsoft.Test/otherWidgets",
    "/subscriptions/{subscription}/providers/Microsoft.Test/widgets/{widget}/parts",
    "/subscriptions/{subscription}/providers/{provider}/widgets",
    "/subscriptions/{subscription}/providers/Microsoft.Test/{type}",
    `${subscriptionPath}/{widgetName}`,
    `${resourceGroupPath}/{widgetName}/parts`,
  ])("does not guess an association for %s", async (listPath) => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${resourceGroupPath}/{widgetName}") @get @armResourceRead(Widget)
        op read(${pathParameters(`${resourceGroupPath}/{widgetName}`)}): Widget;
        @route("${listPath}") @get @armResourceList(Widget)
        op list(${pathParameters(listPath)}): ResourceListResult<Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    expect(provider.resources).toHaveLength(1);
    expect(provider.resources?.[0].operations.lists).toEqual([]);
    expect(provider.providerOperations?.map((op) => [op.name, op.kind])).toEqual([
      ["list", "list"],
    ]);
  });

  it.each([resourceGroupPath, subscriptionPath])(
    "does not attach parent collection %s to a tracked child with an overlapping suffix",
    async (listPath) => {
      const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${resourceGroupPath}/{widgetName}/widgets/{childName}") @get @armResourceRead(Widget)
        op read(${pathParameters(`${resourceGroupPath}/{widgetName}/widgets/{childName}`)}): Widget;
        @route("${listPath}") @get @armResourceList(Widget)
        op list(${pathParameters(listPath)}): ResourceListResult<Widget>;
      }
    `);
      const provider = resolveArmResources(program);
      const child = provider.resources?.find((r) => r.operations.lifecycle.read?.length);
      expect(child?.operations.lists).toEqual([]);
      expect(provider.providerOperations?.map((op) => op.name)).toEqual(["list"]);
    },
  );

  it("matches a complete tracked child type at subscription scope for every eligible identity", async () => {
    const instancePath = `${resourceGroupPath}/{widgetName}/parts/{partName}`;
    const listPath =
      "/Subscriptions/{subscription}/Providers/MICROSOFT.TEST/Widgets/{widget}/Parts";
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${instancePath}") @get @armResourceRead(Widget, "First")
        op readFirst(${pathParameters(instancePath)}): Widget;
        @route("${instancePath}") @put @armResourceCreateOrUpdate(Widget, "Second")
        op createSecond(${pathParameters(instancePath)}): Widget;
        @route("${listPath}") @get @armResourceList(Widget)
        op list(${pathParameters(listPath)}): ResourceListResult<Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    const children = provider.resources?.filter(
      (r) => r.operations.lifecycle.read?.length || r.operations.lifecycle.createOrUpdate?.length,
    );
    expect(children).toHaveLength(2);
    expect(children?.map((r) => r.operations.lists.map((op) => op.name))).toEqual([
      ["list"],
      ["list"],
    ]);
    expect(provider.providerOperations).toEqual([]);
  });

  it.each([
    { parentName: "current", matches: true },
    { parentName: "other", matches: false },
    { parentName: "{widgetName}", matches: false },
  ])(
    "subscription lists preserve literal parent identity: $parentName",
    async ({ parentName, matches }) => {
      const instancePath = `${resourceGroupPath}/current/parts/{partName}`;
      const listPath = `${subscriptionPath}/${parentName}/parts`;
      const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${instancePath}") @get @armResourceRead(Widget)
        op read(${pathParameters(instancePath)}): Widget;
        @route("${listPath}") @get @armResourceList(Widget)
        op list(${pathParameters(listPath)}): ResourceListResult<Widget>;
      }
    `);
      const provider = resolveArmResources(program);
      const child = provider.resources?.find((r) => r.operations.lifecycle.read?.length);
      expect(child?.operations.lists.map((op) => op.name)).toEqual(matches ? ["list"] : []);
      expect(provider.providerOperations?.map((op) => op.name)).toEqual(matches ? [] : ["list"]);
    },
  );

  it.each([
    { listName: "Chosen", expected: ["Chosen"] },
    { listName: "Missing", expected: [] },
    { listName: "", expected: ["Other"] },
  ])("explicit decorator name '$listName' selects grouping", async ({ listName, expected }) => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${resourceGroupPath}/{widgetName}") @get @armResourceRead(Widget, "Other")
        op readOther(${pathParameters(`${resourceGroupPath}/{widgetName}`)}): Widget;
        @route("${subscriptionPath}/{widgetName}") @get @armResourceRead(Widget, "Chosen")
        op readChosen(${pathParameters(`${subscriptionPath}/{widgetName}`)}): Widget;
        @route("${resourceGroupPath}") @get @armResourceList(Widget, "${listName}")
        op list(${pathParameters(resourceGroupPath)}): ResourceListResult<Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    expect(
      provider.resources?.filter((r) => r.operations.lists.length > 0).map((r) => r.resourceName),
    ).toEqual(expected);
    expect(provider.providerOperations?.map((op) => op.name)).toEqual(
      expected.length === 0 ? ["list"] : [],
    );
  });

  it("explicit template names select all same-model occurrences without leaking to another model", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is ExtensionResource<{}> { ...ResourceNameParameter<Widget>; }
      model Other is ExtensionResource<{}> { ...ResourceNameParameter<Other>; }
      @armResourceOperations interface Widgets {
        tenantRead is Extension.Read<Extension.Tenant, Widget, OverrideResourceName = "Chosen">;
        subscriptionRead is Extension.Read<Extension.Subscription, Widget, OverrideResourceName = "Chosen">;
        groupRead is Extension.Read<Extension.ResourceGroup, Widget, OverrideResourceName = "Other">;
        list is Extension.ListByTarget<Extension.ResourceGroup, Widget, OverrideResourceName = "Chosen">;
        otherRead is Extension.Read<Extension.Tenant, Other, OverrideResourceName = "Chosen">;
      }
    `);
    const provider = resolveArmResources(program);
    expect(
      provider.resources
        ?.filter((r) => r.operations.lists.length > 0)
        .map((r) => [r.type.name, r.resourceName]),
    ).toEqual([
      ["Widget", "Chosen"],
      ["Widget", "Chosen"],
    ]);
    expect(provider.providerOperations).toEqual([]);
  });

  it.each([
    "Extension.Tenant",
    "Extension.Subscription",
    "Extension.ResourceGroup",
    "Extension.ManagementGroup",
    "Extension.ServiceGroup",
    'Extension.ExternalResource<"Microsoft.Compute", "virtualMachines", "vmName">',
    "Extension.ScopeParameter",
  ])("matches the extension parent collection at %s", async (scope) => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is ExtensionResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        read is Extension.Read<${scope}, Widget>;
        list is Extension.ListByTarget<${scope}, Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    const widget = provider.resources?.find((r) => r.operations.lifecycle.read?.length);
    ok(widget);
    expect(widget.operations.lists.map((op) => op.name)).toEqual(["list"]);
    expect(provider.providerOperations).toEqual([]);
  });

  it("normalizes parameter names and casing and retains singleton names", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      interface Widgets {
        @route("${resourceGroupPath}/current") @get @armResourceRead(Widget)
        op read(${pathParameters(`${resourceGroupPath}/current`)}): Widget;
        @route("/Subscriptions/{sub}/Resourcegroups/{group}/Providers/MICROSOFT.TEST/Widgets")
        @get @armResourceList(Widget)
        op list(@path sub: string, @path group: string): ResourceListResult<Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    expect(provider.resources?.[0].resourceInstancePath).toBe(`${resourceGroupPath}/current`);
    expect(provider.resources?.[0].operations.lists.map((op) => op.name)).toEqual(["list"]);
  });

  it("attaches a parent list to every equivalent-path standard and legacy identity", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @parentResource(Widget)
      model Part is ProxyResource<{}> { ...ResourceNameParameter<Part>; }
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
    `);
    const parts = resolveArmResources(program).resources?.filter(
      (r) => r.operations.lifecycle.read?.length || r.operations.lifecycle.createOrUpdate?.length,
    );
    expect(parts).toHaveLength(2);
    expect(new Set(parts?.map((r) => r.resourceInstancePath)).size).toBe(1);
    expect(parts?.map((r) => r.operations.lists.map((op) => op.name))).toEqual([
      ["list"],
      ["list"],
    ]);
  });

  it("retains list-only operations without creating identities", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        list is ArmResourceListByParent<Widget>;
      }
    `);
    const provider = resolveArmResources(program);
    expect(provider.resources).toEqual([]);
    expect(provider.providerOperations).toMatchObject([
      { name: "list", kind: "list", resourceName: "Widget", resourceModelName: "Widget" },
    ]);
  });

  it.each([
    "model Widget is Azure.ResourceManager.Legacy.GenericResource<{}> {}",
    '@armVirtualResource model Widget { @path @key @segment("widgets") widgetName: string; }',
  ])(
    "special resource kinds match parents but not cross-scope subscriptions: %s",
    async (model) => {
      const { program } = await Tester.compile(`
      @armProviderNamespace namespace Microsoft.Test;
      ${model}
      interface Widgets {
        @route("${resourceGroupPath}/{widgetName}") @get @armResourceRead(Widget)
        op read(${pathParameters(`${resourceGroupPath}/{widgetName}`)}): Widget;
        @route("${resourceGroupPath}") @get @armResourceList(Widget)
        op listParent(${pathParameters(resourceGroupPath)}): Widget[];
        @route("${subscriptionPath}") @get @armResourceList(Widget)
        op listSubscription(${pathParameters(subscriptionPath)}): Widget[];
      }
    `);
      const provider = resolveArmResources(program);
      expect(provider.resources?.[0].operations.lists.map((op) => op.name)).toEqual(["listParent"]);
      expect(provider.providerOperations?.map((op) => op.name)).toEqual(["listSubscription"]);
    },
  );

  it("keeps unmatched lists version-specific and naming results isolated", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
        @added(Versions.v2)
        list is ArmListBySubscriptionScope<Widget>;
      }
    `);
    const v2 = resolveArmResources(program, { version: "2025-01-01" });
    const v1 = resolveArmResources(program, { version: "2024-01-01" });
    expect(v1.providerOperations).toEqual([]);
    expect(v2.providerOperations?.map((op) => [op.name, op.kind])).toEqual([["list", "list"]]);
    const realm = unsafe_Realm.realmForType.get(v2.resources![0].type);
    expect(realm).toBeDefined();
    expect(unsafe_Realm.realmForType.get(v2.providerOperations![0].operation)).toBe(realm);
    const renamed = resolveArmResources(program, {
      version: "2025-01-01",
      nameResolver: ({ kind }) => (kind === "operation" ? "Renamed" : undefined),
    });
    expect(renamed.providerOperations?.[0].name).toBe("Renamed");
    expect(resolveArmResources(program).providerOperations?.[0].name).toBe("list");
    expect(
      resolveArmResources(program, { version: "2025-01-01" }).providerOperations?.[0].name,
    ).toBe("list");
    expect(v2.resources?.[0].operations.lists).toEqual([]);
  });
});
