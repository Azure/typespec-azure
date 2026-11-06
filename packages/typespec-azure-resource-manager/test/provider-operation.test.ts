import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { getProviderOperation, isProviderOperation, isResourceOperation } from "../src/index.js";
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

  for (const decorator of [
    'extensionResourceOperation(Extension.Subscription, Widget, "read")',
    'builtInResourceOperation(Extension.Subscription, Widget, "read")',
    'legacyResourceOperation(Widget, "read")',
    'legacyExtensionResourceOperation(Widget, "read")',
  ]) {
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
  }

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
