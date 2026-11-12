import {
  unsafe_mutateSubgraph,
  unsafe_MutatorFlow,
  unsafe_Realm,
} from "@typespec/compiler/experimental";
import { t } from "@typespec/compiler/testing";
import { ok } from "node:assert";
import { describe, expect, it } from "vitest";
import { getProviderOperation, isProviderOperation, isResourceOperation } from "../src/index.js";
import {
  getArmResourceOperationData,
  getArmResourceOperationList,
  getArmResourceOperations,
  getOriginalResourceOperationModels,
} from "../src/operations.js";
import { getArmResource } from "../src/private.decorators.js";
import { getResourceNameExpression } from "../src/resource-name.js";
import { resolveArmResources } from "../src/resource.js";
import { Tester } from "./tester.js";

const service = `
  @armProviderNamespace
  namespace Microsoft.Test;
`;
const resource = `
  model Widget is TrackedResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;

describe("provider operations", () => {
  it("registers custom namespace and interface operations", async () => {
    const { program, standalone, custom, ordinary } = await Tester.compile(t.code`
      ${service}
      @route("/standalone") @providerOperation @get op ${t.op("standalone")}(): string;
      interface Custom {
        @route("/custom") @providerOperation @get ${t.op("custom")}(): string;
        @route("/ordinary") @get ${t.op("ordinary")}(): string;
      }
    `);
    for (const operation of [standalone, custom]) {
      expect(getProviderOperation(program, operation)).toBe(operation);
      expect(isProviderOperation(program, operation)).toBe(true);
      expect(isResourceOperation(program, operation)).toBe(false);
    }
    expect(getProviderOperation(program, ordinary)).toBeUndefined();
    expect(isProviderOperation(program, ordinary)).toBe(false);
    expect(isResourceOperation(program, ordinary)).toBe(false);
  });

  it("preserves provider metadata through template aliases and interface inheritance", async () => {
    const { program, Actions, Operations, LegacyOperations } = await Tester.compile(t.code`
      ${service}
      op Custom<T> is ArmProviderActionSync<Response = T>;
      @autoRoute
      interface ${t.interface("Actions")} {
        sync is Custom<string>;
        refreshAsync is ArmProviderActionAsync;
      }
      interface ${t.interface("Operations")} extends Azure.ResourceManager.Operations {}
      @route("/legacy")
      interface ${t.interface("LegacyOperations")} extends Azure.ResourceManager.Legacy.Operations {}
    `);
    for (const iface of [Actions, Operations, LegacyOperations]) {
      for (const operation of iface.operations.values()) {
        expect(getProviderOperation(program, operation)).toBe(operation);
        expect(isProviderOperation(program, operation)).toBe(true);
      }
    }
  });
});

describe("resource operations", () => {
  for (const decorator of [
    "armResourceRead",
    "armResourceCreateOrUpdate",
    "armResourceUpdate",
    "armResourceDelete",
    "armResourceList",
    "armResourceAction",
    "armResourceCheckExistence",
  ]) {
    it(`updates grouping without duplicate registrations for @${decorator}`, async () => {
      const { program, operation } = await Tester.compile(t.code`
        ${service}${resource}
        interface Custom {
          @route("/valid")
          @${decorator}(Widget, "NamedWidgets")
          @${decorator}(Widget)
          ${t.op("operation")}(): void;
        }
      `);
      const model = operation.interface!.namespace!.models.get("Widget")!;
      const identifiers = [...getArmResourceOperationList(program, model)];
      expect(identifiers.length).toBe(1);
      expect(identifiers[0].resourceName).toBe("NamedWidgets");
      expect(getArmResourceOperationData(program, operation)?.resourceName).toBe("NamedWidgets");
    });

    it(`recognizes @${decorator} only for registered resource models`, async () => {
      const { program, valid, invalid } = await Tester.compile(t.code`
        ${service}${resource}
        model NotAResource {}
        interface Custom {
          @route("/valid") @${decorator}(Widget) ${t.op("valid")}(): void;
          @route("/invalid") @${decorator}(NotAResource) ${t.op("invalid")}(): void;
        }
      `);
      expect(isResourceOperation(program, valid)).toBe(true);
      expect(isResourceOperation(program, invalid)).toBe(false);
      expect(isProviderOperation(program, valid)).toBe(false);
    });
  }

  describe("operation registration consistency", () => {
    it.each([
      ["armResourceUpdate", "armResourceRead", "update"],
      ["armResourceList", "armResourceRead", "list"],
      ["armResourceAction", "armResourceRead", "action"],
      ["armResourceList", "armResourceAction", "list"],
      ["armResourceAction", "armResourceList", "action"],
    ])("lets @%s override @%s", async (decorator, previousDecorator, kind) => {
      const [{ program, operation }, diagnostics] = await Tester.compileAndDiagnose(t.code`
            ${service}${resource}
            interface Custom {
              @route("/valid")
              @${decorator}(Widget, "Latest")
              @${previousDecorator}(Widget, "Previous")
              ${t.op("operation")}(): void;
            }
          `);
      expect(diagnostics.map(({ code, message }) => ({ code, message }))).toEqual([]);
      const model = operation.interface!.namespace!.models.get("Widget")!;
      const identifiers = [...getArmResourceOperationList(program, model)];
      expect(identifiers.length).toBe(1);
      expect(identifiers[0]).toMatchObject({ kind, resourceName: "Latest" });
      expect(getArmResourceOperationData(program, operation)).toMatchObject({
        kind,
        resourceName: "Latest",
      });
      const compatibility = getArmResourceOperations(program, model);
      expect(compatibility.lifecycle.read).toBeUndefined();
      if (kind !== "list") expect(compatibility.lists[operation.name]).toBeUndefined();
      if (kind !== "action") expect(compatibility.actions[operation.name]).toBeUndefined();
      expect(getResourceNameExpression(program, operation)).toEqual({
        kind: "explicit",
        value: "Latest",
      });
    });
  });
  it("keeps a paged GET action classified as an action", async () => {
    const { program, operation } = await Tester.compile(t.code`
      ${service}${resource}
      @armResourceOperations interface Widgets {
        @get @list
        ${t.op("operation")} is ArmResourceActionSync<Widget, void, ResourceListResult<Widget>>;
      }
    `);
    expect(getArmResourceOperationData(program, operation)?.kind).toBe("action");
    const model = operation.interface!.namespace!.models.get("Widget")!;
    const operations = getArmResourceOperations(program, model);
    expect(operations.actions[operation.name]?.operation === operation).toBe(true);
    expect(Object.keys(operations.lists)).toEqual([]);
  });
  for (const decorator of [
    "read",
    "createOrUpdate",
    "update",
    "delete",
    "list",
    "action",
    "checkExistence",
  ].flatMap((kind) => [
    `extensionResourceOperation(Extension.Subscription, Widget, "${kind}")`,
    `builtInResourceOperation(Extension.Subscription, Widget, "${kind}")`,
    `legacyResourceOperation(Widget, "${kind}")`,
    `legacyExtensionResourceOperation(Widget, "${kind}")`,
  ])) {
    it(`recognizes private registration through ${decorator}`, async () => {
      const { program, valid, invalid } = await Tester.compile(t.code`
        ${service}${resource}
        model NotAResource {}
        interface Custom {
          @route("/valid")
          @Azure.ResourceManager.Private.${decorator}
          ${t.op("valid")}(): void;
          @route("/invalid")
          @Azure.ResourceManager.Private.${decorator.replace("Widget", "NotAResource")}
          ${t.op("invalid")}(): void;
        }

      `);
      expect(isResourceOperation(program, valid)).toBe(true);
      expect(isResourceOperation(program, invalid)).toBe(false);
    });

    it(`overrides private grouping through ${decorator}`, async () => {
      const { program, operation } = await Tester.compile(t.code`
        ${service}${resource}
        interface Custom {
          @route("/valid")
          @Azure.ResourceManager.Private.${decorator.slice(0, -1)}, "NamedWidgets")
          @Azure.ResourceManager.Private.${decorator}
          ${t.op("operation")}(): void;
        }
      `);
      const model = operation.interface!.namespace!.models.get("Widget")!;
      const identifiers = [...getArmResourceOperationList(program, model)];
      expect(identifiers.length).toBe(1);
      expect(identifiers[0].resourceName).toBe("NamedWidgets");
      expect(getArmResourceOperationData(program, operation)?.resourceName).toBe("NamedWidgets");
    });
  }

  it.each([
    ['extensionResourceOperation(Extension.Subscription, Widget, "update", "Latest")', "update"],
    ['builtInResourceOperation(Extension.Subscription, Widget, "list", "Latest")', "list"],
    ['legacyResourceOperation(Widget, "action", "Latest")', "action"],
    ['legacyExtensionResourceOperation(Widget, "checkExistence", "Latest")', "checkExistence"],
  ])("allows a private kind override: %s", async (decorator, kind) => {
    const [{ program, operation }, diagnostics] = await Tester.compileAndDiagnose(t.code`
      ${service}${resource}
      interface Custom {
        @route("/valid")
        @Azure.ResourceManager.Private.${decorator}
        @armResourceRead(Widget, "Previous")
        ${t.op("operation")}(): void;
      }
    `);
    expect(diagnostics.map(({ code, message }) => ({ code, message }))).toEqual([]);
    expect(getArmResourceOperationData(program, operation)).toMatchObject({
      kind,
      resourceName: "Latest",
    });
    const model = operation.interface!.namespace!.models.get("Widget")!;
    expect(getArmResourceOperations(program, model).lifecycle.read).toBeUndefined();
    expect(getResourceNameExpression(program, operation)).toEqual({
      kind: "explicit",
      value: "Latest",
    });
  });

  it.each([
    ["genericResourceInternal", 'armResourceWithParameter({}, "widgets", "widgetName")', "Generic"],
    ['armResourceWithParameter({}, "widgets", "widgetName")', "genericResourceInternal", "Proxy"],
  ])("allows the outer model registration to overwrite %s / %s", async (outer, inner, kind) => {
    const { program, Widget } = await Tester.compile(t.code`
      ${service}
      @Azure.ResourceManager.Private.${outer}
      @Azure.ResourceManager.Private.${inner}
      model ${t.model("Widget")} {}
    `);
    expect(getArmResource(program, Widget)?.kind).toBe(kind);
  });

  it("recognizes standard, extension, and legacy templates", async () => {
    const { program, Standard, Extensions, Legacy, LegacyExtensions } = await Tester.compile(t.code`
      ${service}${resource}
      model Extra is ExtensionResource<{}> { ...ResourceNameParameter<Extra>; }
      @armResourceOperations
      interface ${t.interface("Standard")} extends TrackedResourceOperations<Widget, {}> {}
      @armResourceOperations
      interface ${t.interface("Extensions")} {
        get is Extension.Read<Extension.Subscription, Extra>;
      }
      interface Routed extends Azure.ResourceManager.Legacy.RoutedOperations<{}, {}> {}
      @armResourceOperations(#{allowStaticRoutes: true})
      interface ${t.interface("Legacy")} {
        @route("/widgets/{name}")
        get is Routed.Read<Widget, Parameters = { @path name: string }>;
      }
      interface ExtensionTemplates extends Azure.ResourceManager.Legacy.ExtensionOperations<{}, {}, {}> {}
      @armResourceOperations(#{allowStaticRoutes: true})
      interface ${t.interface("LegacyExtensions")} {
        @route("/extra/{name}")
        get is ExtensionTemplates.Read<Extra, Parameters = { @path name: string }>;
      }
    `);
    for (const iface of [Standard, Extensions, Legacy, LegacyExtensions]) {
      for (const operation of iface.operations.values()) {
        expect(isResourceOperation(program, operation)).toBe(true);
      }
    }
  });
});

describe("resource registration version isolation", () => {
  it.each([
    ["armResourceAction", "armResourceList", "action"],
    ["armResourceList", "armResourceAction", "list"],
  ])("resolves the latest @%s registration across versions", async (outer, inner, kind) => {
    const { program } = await Tester.compile(
      `
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01", v3: "2026-01-01" }
      ${resource}
      @armResourceOperations interface Widgets {
        get is ArmResourceRead<Widget>;
        #suppress "@azure-tools/typespec-azure-resource-manager/no-resource-operation-conflict" "Verify intentional last-registration-wins compatibility."
        @get @list @${outer}(Widget) @${inner}(Widget)
        related is ArmResourceActionSync<Widget, void, ResourceListResult<Widget>>;
      }
    `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              "@azure-tools/typespec-azure-resource-manager/no-resource-operation-conflict": true,
            },
          },
        },
      },
    );
    for (const version of [undefined, "2026-01-01", "2024-01-01", "2025-01-01", undefined]) {
      const provider = resolveArmResources(
        program,
        version === undefined ? undefined : { version },
      );
      const operations = [
        ...(provider.providerOperations ?? []),
        ...(provider.resources ?? []).flatMap(({ operations }) => [
          ...Object.values(operations.lifecycle).flatMap((entries) => entries ?? []),
          ...operations.actions,
          ...operations.lists,
        ]),
      ].filter(({ operation }) => operation.name === "related");
      expect(operations.map(({ kind }) => kind)).toEqual([kind]);
      expect(
        provider.resources?.some(({ operations }) => operations.lifecycle.read?.length === 1),
      ).toBe(true);
    }
    expect(program.diagnostics.map(({ code, message }) => ({ code, message }))).toEqual([]);
  });

  it.each([
    ["2024-01-01", "2025-01-01", "2026-01-01"],
    ["2026-01-01", "2025-01-01", "2024-01-01"],
  ])("preserves grouping and original registrations in version order %j", async (...versions) => {
    const { program, Widget, read } = await Tester.compile(t.code`
      @armProviderNamespace @versioned(Versions) namespace Microsoft.Test;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01", v3: "2026-01-01" }
      @renamedFrom(Versions.v2, "OldWidget")
      model ${t.model("Widget")} is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        @armResourceRead(Widget, "NamedWidgets")
        ${t.op("read")} is ArmResourceRead<Widget>;
      }
    `);
    const original = resolveArmResources(program);
    for (const version of versions) {
      const provider = resolveArmResources(program, { version });
      ok(provider?.resources);
      const modelName = version === "2024-01-01" ? "OldWidget" : "Widget";
      const resource = provider.resources.find(({ type }) => type.name === modelName)!;
      const projectedRead = resource.operations.lifecycle.read![0].operation;
      expect(projectedRead === read).toBe(false);
      expect(resource.type === Widget).toBe(false);
      expect(unsafe_Realm.realmForType.get(projectedRead)).toBe(
        unsafe_Realm.realmForType.get(resource.type),
      );
      expect(getArmResourceOperationData(program, projectedRead)?.resourceName).toBe(
        "NamedWidgets",
      );
      const identifiers = [...getArmResourceOperationList(program, resource.type)].filter(
        ({ operation }) => operation === projectedRead,
      );
      expect(identifiers.length).toBe(1);
      expect(identifiers[0].resource).toBeUndefined();
      expect(identifiers[0].resourceName).toBe("NamedWidgets");
      expect(isResourceOperation(program, projectedRead)).toBe(true);
      const repeated = resolveArmResources(program, { version });
      ok(repeated?.resources);
      expect(
        repeated.resources.find(({ type }) => type.name === modelName)!.type === resource.type,
      ).toBe(true);
    }
    expect(resolveArmResources(program) === original).toBe(true);
    expect(getArmResourceOperationData(program, read)?.resourceName).toBe("NamedWidgets");
    const models = getOriginalResourceOperationModels(program);
    expect(models.size).toBe(1);
    expect(models.get(read)?.size).toBe(1);
    expect(models.get(read)?.has(Widget)).toBe(true);
  });

  it("allows an operation-only mutation to share the original resource model", async () => {
    const { program, Widget, read } = await Tester.compile(t.code`
      ${service}
      model ${t.model("Widget")} is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        @armResourceRead(Widget, "NamedWidgets")
        ${t.op("read")} is ArmResourceRead<Widget>;
      }
    `);
    const projection = unsafe_mutateSubgraph(
      program,
      [
        {
          name: "Operation-only registration replay",
          Model: {
            filter: () => unsafe_MutatorFlow.DoNotMutate | unsafe_MutatorFlow.DoNotRecur,
            mutate: () => {
              throw new Error("The resource model must remain shared");
            },
          },
          Operation: (_source, clone) => {
            clone.name = "projectedRead";
          },
        },
      ],
      read,
    );
    ok(projection.type.kind === "Operation");
    expect(projection.type === read).toBe(false);
    expect(unsafe_Realm.realmForType.get(projection.type)).toBeDefined();
    expect(unsafe_Realm.realmForType.get(Widget)).toBeUndefined();
    expect(isResourceOperation(program, projection.type)).toBe(true);
    expect(getArmResourceOperationData(program, projection.type)?.resourceName).toBe(
      "NamedWidgets",
    );
    expect(getArmResourceOperationData(program, read)?.resourceName).toBe("NamedWidgets");
    const models = getOriginalResourceOperationModels(program);
    expect(models.has(projection.type)).toBe(false);
    expect(models.get(read)?.has(Widget)).toBe(true);
  });

  it("keeps an unvisited operation unchanged when only its generic resource model is mutated", async () => {
    const { program, read } = await Tester.compile(t.code`
      ${service}
      @Azure.ResourceManager.Private.genericResourceInternal
      model Generic<T> { value: T; }
      interface Custom {
        @get @route("/generic")
        @armResourceRead(Generic<string>, "NamedGenerics")
        ${t.op("read")}(): void;
      }
    `);
    const model = [...getOriginalResourceOperationModels(program).get(read)!][0];
    const projection = unsafe_mutateSubgraph(
      program,
      [
        {
          name: "Model-only registration replay",
          Model: {
            filter: (source) =>
              source === model
                ? true
                : unsafe_MutatorFlow.DoNotMutate | unsafe_MutatorFlow.DoNotRecur,
            mutate: (_source, clone) => {
              clone.name = "ProjectedGeneric";
            },
          },
        },
      ],
      model,
    );
    ok(projection.type.kind === "Model");
    expect(projection.type === model).toBe(false);
    expect(getArmResource(program, projection.type)?.typespecType === projection.type).toBe(true);
    expect(getArmResourceOperationList(program, projection.type).size).toBe(0);
    expect(getArmResourceOperationData(program, read)?.resourceName).toBe("NamedGenerics");
    const owners = getOriginalResourceOperationModels(program).get(read)!;
    expect(owners.size).toBe(1);
    expect(owners.has(model)).toBe(true);
  });
});
