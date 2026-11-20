import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { trackedResourceMissingOperationsRule } from "../../src/rules/tracked-resource-missing-operations.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    trackedResourceMissingOperationsRule,
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

const diagnostic = (name: string, verb: "PUT" | "PATCH") => ({
  code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
  message: `Tracked resource '${name}' must have a ${verb} operation.`,
});

it("accepts a tracked resource with PUT and PATCH operations", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
    `,
    )
    .toBeValid();
});

it("reports a missing PATCH for a tracked resource with PUT", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Widget", "PATCH"));
});

it("reports a missing PUT for a tracked resource with PATCH", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Widget", "PUT"));
});

it("reports both missing operations when a tracked resource only has a read", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("Widget", "PUT"), diagnostic("Widget", "PATCH")]);
});

it("reports both missing operations for a registered resource without operations", async () => {
  await tester
    .expect(service)
    .toEmitDiagnostics([diagnostic("Widget", "PUT"), diagnostic("Widget", "PATCH")]);
});

it("requires the actual HTTP verbs, not just lifecycle decorators", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        @get @armResourceCreateOrUpdate(Widget)
        create(...ResourceInstanceParameters<Widget>): Widget;
        @post @armResourceUpdate(Widget)
        update(...ResourceInstanceParameters<Widget>): Widget;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("Widget", "PUT"), diagnostic("Widget", "PATCH")]);
});

it("recognizes legacy lifecycle operations on the tracked resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service namespace Microsoft.Contoso;
      @subscriptionResource
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      alias Ops = Azure.ResourceManager.Legacy.LegacyOperations<
        { ...ApiVersionParameter; ...SubscriptionIdParameter; ...Azure.ResourceManager.Legacy.Provider; },
        { @segment("widgets") @key @path widgetName: string; }
      >;
      @armResourceOperations interface Widgets {
        create is Ops.CreateOrUpdateSync<Widget>;
        update is Ops.CustomPatchSync<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("reports the versions where a lifecycle operation is unavailable", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service @versioned(Versions) namespace Microsoft.Contoso;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01", v3: "2026-01-01", v4: "2027-01-01" }
      @added(Versions.v2)
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        @added(Versions.v2)
        create is ArmResourceCreateOrReplaceSync<Widget>;
        @added(Versions.v3)
        @removed(Versions.v4)
        update is ArmResourcePatchSync<Widget, {}>;
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
      message: "Tracked resource 'Widget' must have a PATCH operation for 2025-01-01, 2027-01-01.",
    });
});

it("accounts for an operation interface added in a later version", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service @versioned(Versions) namespace Microsoft.Contoso;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @added(Versions.v2)
      @armResourceOperations interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        update is ArmResourcePatchSync<Widget, {}>;
      }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
        message: "Tracked resource 'Widget' must have a PUT operation for 2024-01-01.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
        message: "Tracked resource 'Widget' must have a PATCH operation for 2024-01-01.",
      },
    ]);
});

it("checks inherited service versions in child namespaces", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service @versioned(Versions)
      namespace Microsoft.Contoso {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        namespace Resources {
          model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
          @armResourceOperations interface Widgets {
            create is ArmResourceCreateOrReplaceSync<Widget>;
            @added(Versions.v2)
            update is ArmResourcePatchSync<Widget, {}>;
          }
        }
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
      message: "Tracked resource 'Widget' must have a PATCH operation for 2024-01-01.",
    });
});

it("does not require operations before a child-namespace resource exists", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service @versioned(Versions)
      namespace Microsoft.Contoso {
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        namespace Resources {
          @added(Versions.v2)
          model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
          @added(Versions.v2)
          @armResourceOperations interface Widgets {
            create is ArmResourceCreateOrReplaceSync<Widget>;
            update is ArmResourcePatchSync<Widget, {}>;
          }
        }
      }
    `,
    )
    .toBeValid();
});

it("uses consuming service versions for shared library resources", async () => {
  await tester
    .expect(
      `
      @armLibraryNamespace @versioned(Versions)
      namespace Shared {
        enum Versions { v1: "lib1", v2: "lib2" }
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      }
      @armProviderNamespace("Microsoft.Contoso")
      @useLibraryNamespace(Shared) @service @versioned(Versions)
      namespace Service {
        enum Versions {
          @useDependency(Shared.Versions.v1) v1: "2024-01-01",
          @useDependency(Shared.Versions.v2) v2: "2025-01-01",
        }
        @armResourceOperations interface Widgets {
          @added(Versions.v2)
          create is ArmResourceCreateOrReplaceSync<Shared.Widget>;
          @added(Versions.v2)
          update is ArmResourcePatchSync<Shared.Widget, {}>;
        }
      }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
        message: "Tracked resource 'Widget' must have a PUT operation for 2024-01-01.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
        message: "Tracked resource 'Widget' must have a PATCH operation for 2024-01-01.",
      },
    ]);
});

it("does not use one service's operations to satisfy another service", async () => {
  await tester
    .expect(
      `
      @armLibraryNamespace namespace Shared {
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      }
      @armProviderNamespace("Microsoft.First") @useLibraryNamespace(Shared)
      @service @versioned(Versions) namespace First {
        enum Versions { v1: "2024-01-01" }
        @armResourceOperations interface Widgets {
          create is ArmResourceCreateOrReplaceSync<Shared.Widget>;
          update is ArmResourcePatchSync<Shared.Widget, {}>;
        }
      }
      @armProviderNamespace("Microsoft.Second") @useLibraryNamespace(Shared)
      @service @versioned(Versions) namespace Second {
        enum Versions { v1: "2024-01-01" }
        @armResourceOperations interface Widgets {
          create is ArmResourceCreateOrReplaceSync<Shared.Widget>;
        }
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
      message: "Tracked resource 'Widget' must have a PATCH operation for Second 2024-01-01.",
    });
});

it("does not expose a library operation to services that do not inherit it", async () => {
  await tester
    .expect(
      `
      @armLibraryNamespace namespace Shared {
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Updates {
          update is ArmResourcePatchSync<Widget, {}>;
        }
      }
      @armProviderNamespace("Microsoft.First") @useLibraryNamespace(Shared)
      @service namespace First {
        @armResourceOperations interface Widgets extends Shared.Updates {
          create is ArmResourceCreateOrReplaceSync<Shared.Widget>;
        }
      }
      @armProviderNamespace("Microsoft.Second") @useLibraryNamespace(Shared)
      @service namespace Second {
        @armResourceOperations interface Widgets {
          create is ArmResourceCreateOrReplaceSync<Shared.Widget>;
        }
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations",
      message: "Tracked resource 'Widget' must have a PATCH operation for Second.",
    });
});

it("recognizes operations in nested HTTP services", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace("Microsoft.First") @service namespace First {
        @armProviderNamespace("Microsoft.Second") @service namespace Second {
          model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
          @armResourceOperations interface Widgets {
            create is ArmResourceCreateOrReplaceSync<Widget>;
            update is ArmResourcePatchSync<Widget, {}>;
          }
        }
      }
    `,
    )
    .toBeValid();
});

it("does not mistake an action suffix for a private endpoint proxy item path", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        privateEndpointConnectionProxies is ArmResourceActionSync<Widget, void, void>;
        create is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Widget", "PATCH"));
});

it("does not count a PATCH on a different resource path", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        @route("/other/{widgetName}") @patch @armResourceUpdate(Widget)
        update(@path widgetName: string): Widget;
        @route("/widgets/{widgetName}") @put @armResourceCreateOrUpdate(Widget)
        create(@path widgetName: string): Widget;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Widget", "PATCH"));
});

it("allows both warnings to be suppressed on the resource", async () => {
  const runner = await Tester.createInstance();
  const ruleCode =
    "@azure-tools/typespec-azure-resource-manager/tracked-resource-missing-operations";
  const options = { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } };
  expectDiagnostics(await runner.diagnose(service, options), [
    diagnostic("Widget", "PUT"),
    diagnostic("Widget", "PATCH"),
  ]);
  const suppressed = service.replace(
    "model Widget is",
    `#suppress "${ruleCode}" "Approved exception"\n  model Widget is`,
  );
  expectDiagnosticEmpty(await (await Tester.createInstance()).diagnose(suppressed, options));
});

it("does not use operations on a different resource to satisfy the requirement", async () => {
  await tester
    .expect(
      `${service}
      model Other is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<Other>;
      }
      @armResourceOperations interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        updateOther is ArmResourcePatchSync<Other, WidgetProperties>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("Widget", "PATCH"), diagnostic("Other", "PUT")]);
});

it("does not require operations on a proxy resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service namespace Microsoft.Contoso;
      model Proxy is ProxyResource<{}> { ...ResourceNameParameter<Proxy>; }
      @armResourceOperations interface Proxies {
        read is ArmResourceRead<Proxy>;
      }
    `,
    )
    .toBeValid();
});

it("does not require PATCH on a private endpoint connection proxy path", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service namespace Microsoft.Contoso;
      model Widget is TrackedResource<{}> {
        @key("widgetName") @segment("privateEndpointConnectionProxies") name: string;
      }
      @armResourceOperations interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("still requires PUT on a private endpoint connection proxy path", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace @service namespace Microsoft.Contoso;
      model Widget is TrackedResource<{}> {
        @key("widgetName") @segment("privateEndpointConnectionProxies") name: string;
      }
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Widget", "PUT"));
});

it.each([true, false])(
  "checks every PUT path for PATCH regardless of proxy declaration order (proxy first: %s)",
  async (proxyFirst) => {
    const proxy = `
      @route("/privateEndpointConnectionProxies/{widgetName}") @put @armResourceCreateOrUpdate(Widget)
      proxy(@path widgetName: string): Widget;
    `;
    const widget = `
      @route("/widgets/{widgetName}") @put @armResourceCreateOrUpdate(Widget)
      create(@path widgetName: string): Widget;
    `;
    const operations = proxyFirst ? proxy + widget : widget + proxy;
    const code = `${service}
      @armResourceOperations interface Widgets {
        ${operations}
      }
    `;
    await tester.expect(code).toEmitDiagnostics(diagnostic("Widget", "PATCH"));
    await tester
      .expect(
        code.replace(
          operations,
          `${operations}
          @route("/widgets/{widgetName}") @patch @armResourceUpdate(Widget)
          update(@path widgetName: string): Widget;`,
        ),
      )
      .toBeValid();
  },
);

it("requires PATCH for a non-proxy read path even when PUT uses an exempt proxy path", async () => {
  const code = `${service}
    @armResourceOperations interface Widgets {
      @route("/privateEndpointConnectionProxies/{widgetName}") @put @armResourceCreateOrUpdate(Widget)
      proxy(@path widgetName: string): Widget;
      @route("/widgets/{widgetName}") @get @armResourceRead(Widget)
      read(@path widgetName: string): Widget;
    }
  `;
  await tester.expect(code).toEmitDiagnostics(diagnostic("Widget", "PATCH"));
  await tester
    .expect(
      code.replace(
        "read(@path widgetName: string): Widget;",
        `read(@path widgetName: string): Widget;
        @route("/widgets/{widgetName}") @patch @armResourceUpdate(Widget)
        update(@path widgetName: string): Widget;`,
      ),
    )
    .toBeValid();
});

it("recognizes equivalent item paths with different parameter names and casing", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        @route("/widgets/{widgetName}") @put @armResourceCreateOrUpdate(Widget)
        create(@path widgetName: string): Widget;
        @route("/Widgets/{resourceName}") @get @armResourceRead(Widget)
        read(@path resourceName: string): Widget;
        @route("/widgets/{widgetName}") @patch @armResourceUpdate(Widget)
        update(@path widgetName: string): Widget;
      }
    `,
    )
    .toBeValid();
});

it("recognizes equivalent item paths with parameter names followed by literal text", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        @route("/widgets/{widgetName}:component") @put @armResourceCreateOrUpdate(Widget)
        create(@path widgetName: string): Widget;
        @route("/widgets/{resourceName}:component") @patch @armResourceUpdate(Widget)
        update(@path resourceName: string): Widget;
      }
    `,
    )
    .toBeValid();
});

it("does not equate an item path with a compound parameter path", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        @route("/widgets/{widgetName}") @put @armResourceCreateOrUpdate(Widget)
        create(@path widgetName: string): Widget;
        @route("/widgets/{widgetName}-{suffix}") @patch @armResourceUpdate(Widget)
        update(@path widgetName: string, @path suffix: string): Widget;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("Widget", "PATCH"));
});
