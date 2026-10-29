import { Tester } from "#test/tester.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveArmResources } from "../../src/resource.js";
import { noResourceNameConflictRule } from "../../src/rules/no-resource-name-conflict.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noResourceNameConflictRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/no-resource-name-conflict",
  severity: "warning",
  message: /Resources must have unique names\./,
} as const;

const employee = `
  model Employee is ExtensionResource<{}> {
    ...ResourceNameParameter<Employee>;
  }
`;

function extensionSpec(vmName = "", scaleSetVmName = "", sameTargetModelName = true) {
  return `
    @armProviderNamespace
    namespace Microsoft.Contoso;
    ${employee}

    alias VirtualMachine = Extension.ExternalResource<
      "Microsoft.Compute", "virtualMachines", "vmName"
    >;
    alias ScaleSet = Extension.ExternalResource<
      "Microsoft.Compute", "virtualMachineScaleSets", "scaleSetName"
    >;
    alias ScaleSetVm = Extension.ExternalChildResource<
      ScaleSet, "virtualMachines", "vmName"
    >;
    ${
      sameTargetModelName
        ? `
      namespace Vm { model Target is VirtualMachine; }
      namespace ScaleSetVmScope { model Target is ScaleSetVm; }
    `
        : ""
    }

    interface EmployeeOperations<
      Scope extends Azure.ResourceManager.Foundations.SimpleResource,
      ResourceName extends valueof string = ""
    > {
      get is Extension.Read<Scope, Employee, OverrideResourceName = ResourceName>;
      list is Extension.ListByTarget<Scope, Employee, OverrideResourceName = ResourceName>;
    }

    @armResourceOperations
    interface VmEmployees extends EmployeeOperations<${sameTargetModelName ? "Vm.Target" : "VirtualMachine"}, "${vmName}"> {}
    @armResourceOperations
    interface ScaleSetVmEmployees extends EmployeeOperations<${sameTargetModelName ? "ScaleSetVmScope.Target" : "ScaleSetVm"}, "${scaleSetVmName}"> {}
  `;
}

function standardService(namespace: string, modelName: string, resourceName?: string) {
  return `
    @armProviderNamespace("Microsoft.Contoso")
    namespace ${namespace} {
      model ${modelName} is ProxyResource<{}> {
        ...ResourceNameParameter<${modelName}>;
      }
      @armResourceOperations
      interface Resources {
        ${resourceName === undefined ? "" : `@armResourceRead(${modelName}, "${resourceName}")`}
        get is ArmResourceRead<${modelName}>;
      }
    }
  `;
}

function legacySpec(explicitNames: boolean, crossScope = false) {
  return `
    @armProviderNamespace
    namespace Microsoft.Contoso;
    model RunCommand is ProxyResource<{}> {
      ...ResourceNameParameter<RunCommand>;
    }
    alias VmOperations = Legacy.LegacyOperations<
      {
        ...ApiVersionParameter;
        ...SubscriptionIdParameter;
        ...Legacy.Provider;
        @path @key @segment("virtualMachines") vmName: string;
      },
      { @path @key @segment("runCommands") commandName: string; }
      ${explicitNames ? ', ResourceName = "VmRunCommand"' : ""}
    >;
    alias ScaleSetVmOperations = Legacy.LegacyOperations<
      {
        ...ApiVersionParameter;
        ${crossScope ? "" : "...SubscriptionIdParameter;"}
        ...Legacy.Provider;
        ${crossScope ? "" : '@path @key @segment("virtualMachineScaleSets") scaleSetName: string;'}
        @path @key @segment("virtualMachines") vmName: string;
      },
      { @path @key @segment("runCommands") commandName: string; }
      ${explicitNames ? ', ResourceName = "ScaleSetVmRunCommand"' : ""}
    >;
    @armResourceOperations
    interface VmRunCommands {
      get is VmOperations.Read<RunCommand>;
      list is VmOperations.List<RunCommand>;
    }
    @armResourceOperations
    interface ScaleSetVmRunCommands {
      get is ScaleSetVmOperations.Read<RunCommand>;
      list is ScaleSetVmOperations.List<RunCommand>;
    }
  `;
}

describe("no-resource-name-conflict", () => {
  it("ignores library types and uninstantiated resource operation templates", async () => {
    await tester
      .expect(
        `
          model Example {}
          interface ResourceOperations<T extends Azure.ResourceManager.Foundations.SimpleResource> {
            get is ArmResourceRead<T>;
          }
        `,
      )
      .toBeValid();
  });

  it("ignores non-ARM services", async () => {
    await tester
      .expect(
        `
      @service namespace First { model Widget {} }
      @service namespace Second { model Widget {} }
    `,
      )
      .toBeValid();
  });

  it("accepts an ARM service without resources", async () => {
    await tester.expect("@armProviderNamespace namespace Microsoft.Contoso;").toBeValid();
  });

  it.each(["Shared", "Azure.Core.TestResources", "Azure.ResourceManager.TestResources"])(
    "ignores operations declared only in the %s library namespace",
    async (libraryNamespace) => {
      await tester
        .expect(
          `
          @armLibraryNamespace
          namespace ${libraryNamespace} {
            model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
            @armResourceOperations
            interface Widgets { get is ArmResourceRead<Widget>; }
          }

          @armProviderNamespace("Microsoft.Contoso")
          @useLibraryNamespace(${libraryNamespace})
          namespace Service {
            model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
            @armResourceOperations
            interface Widgets { get is ArmResourceRead<Widget>; }
          }
          `,
        )
        .toBeValid();
    },
  );

  it("accepts distinct standard resource names across services sharing a provider", async () => {
    await tester
      .expect(standardService("First", "Widget") + standardService("Second", "Gadget"))
      .toBeValid();
  });

  it("reports a collision across service namespaces", async () => {
    await tester
      .expect(standardService("First", "Widget") + standardService("Second", "Widget"))
      .toEmitDiagnostics({
        ...diagnostic,
        target: "get",
        message:
          "Resources must have unique names. Resource name 'Widget' is used by both " +
          "'/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}' and " +
          "'/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}'. " +
          "Provide a unique resource name when instantiating the resource operations.",
      });
  });

  it("reports every occurrence after the first in a name collision", async () => {
    await tester
      .expect(
        standardService("First", "Widget", "Duplicate") +
          standardService("Second", "Gadget", "Duplicate") +
          standardService("Third", "Other", "Duplicate"),
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
  });

  it("accepts explicit standard operation names", async () => {
    await tester
      .expect(
        standardService("First", "Widget", "FirstWidget") +
          standardService("Second", "Widget", "SecondWidget"),
      )
      .toBeValid();
  });

  it("compares logical names exactly", async () => {
    await tester
      .expect(
        standardService("First", "Widget", "Widget") +
          standardService("Second", "Widget", "widget"),
      )
      .toBeValid();
  });

  it("checks the declaration view of independently versioned services", async () => {
    const services = ["First", "Second"]
      .map(
        (namespace) => `
      @armProviderNamespace("Microsoft.Contoso")
      @versioned(Versions)
      namespace ${namespace} {
        enum Versions { v1: "2025-01-01", v2: "2026-01-01" }
        model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations
        interface Widgets { get is ArmResourceRead<Widget>; }
      }
    `,
      )
      .join("\n");
    await tester.expect(services).toEmitDiagnostics(diagnostic);
  });

  it("reports default names that collide across extension targets", async () => {
    await tester.expect(extensionSpec()).toEmitDiagnostics(diagnostic);
  });

  it("accepts identical terminal segments when the default target model names differ", async () => {
    await tester.expect(extensionSpec("", "", false)).toBeValid();
  });

  it("accepts explicit extension names and ignores synthetic external parents", async () => {
    const code = extensionSpec("VmEmployee", "ScaleSetVmEmployee");
    await tester.expect(code).toBeValid();
    const { program } = await Tester.compile(code);
    const resources = resolveArmResources(program).resources!;
    expect(
      resources
        .filter((resource) => resource.operations.lifecycle.read?.length)
        .map((resource) => resource.resourceName),
    ).toEqual(["VmEmployee", "ScaleSetVmEmployee"]);
    expect(
      resources.filter((resource) => !resource.operations.lifecycle.read?.length).length,
    ).toBeGreaterThan(0);
  });

  it("reports explicit names that collide across extension targets", async () => {
    await tester.expect(extensionSpec("Employee", "Employee")).toEmitDiagnostics(diagnostic);
  });

  it.each([false, true])(
    "reports legacy fallback collisions (cross-scope: %s)",
    async (crossScope) => {
      await tester.expect(legacySpec(false, crossScope)).toEmitDiagnostics({
        ...diagnostic,
        message: /Resource name 'VirtualMachinesRunCommands'/,
      });
    },
  );

  it.each([false, true])("accepts explicit legacy names (cross-scope: %s)", async (crossScope) => {
    await tester.expect(legacySpec(true, crossScope)).toBeValid();
  });

  it("does not report multiple operations on one resource as conflicting resources", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations
      interface Widgets {
        get is ArmResourceRead<Widget>;
        create is ArmResourceCreateOrReplaceSync<Widget>;
        delete is ArmResourceDeleteSync<Widget>;
        list is ArmResourceListByParent<Widget>;
      }
    `,
      )
      .toBeValid();
  });

  it("targets a create operation when a conflicting resource has no read operation", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      model Gadget is ProxyResource<{}> { ...ResourceNameParameter<Gadget>; }
      @armResourceOperations
      interface Widgets { get is ArmResourceRead<Widget>; }
      @armResourceOperations
      interface Gadgets {
        @armResourceCreateOrUpdate(Gadget, "Widget")
        create is ArmResourceCreateOrReplaceSync<Gadget>;
      }
    `,
      )
      .toEmitDiagnostics({
        ...diagnostic,
        target: "create",
      });
  });
});
