import { Model, Operation } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics, t } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { ArmLifecycleOperationKind } from "../src/operations.js";
import { ArmResourceDetails, getArmResources } from "../src/resource.js";
import { Tester } from "./tester.js";

function assertLifecycleOperation(
  resource: ArmResourceDetails,
  kind: ArmLifecycleOperationKind,
  operationGroup: string,
) {
  ok(resource.operations.lifecycle[kind], `No ${kind} operation`);
  strictEqual(resource.operations.lifecycle[kind]!.kind, kind);
  strictEqual(resource.operations.lifecycle[kind]!.operationGroup, operationGroup);
}

function getResourcePropertyProperties(resource: ArmResourceDetails, propertyName: string) {
  const propertyType = resource.typespecType.properties.get("properties")?.type as Model;
  return propertyType.properties.get(propertyName);
}

describe("ARM resource model:", () => {
  it("gathers metadata about TrackedResources", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model FooResourceProperties {
        iAmFoo: string;
        provisioningState: ResourceState;
      }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 1);

    const foo = resources[0];
    strictEqual(foo.name, "FooResource");
    strictEqual(foo.kind, "Tracked");
    strictEqual(foo.collectionName, "foos");
    strictEqual(foo.keyName, "fooName");
    strictEqual(foo.armProviderNamespace, "Microsoft.Test");

    // Check operations
    assertLifecycleOperation(foo, "read", "Foos");
    assertLifecycleOperation(foo, "createOrUpdate", "Foos");
    assertLifecycleOperation(foo, "update", "Foos");
    assertLifecycleOperation(foo, "delete", "Foos");
  });

  it("allows overriding armProviderNamespace", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      @service
      
          namespace Microsoft.Test {

      interface Operations extends Azure.ResourceManager.Operations {}

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

     model FooResourceProperties {
       displayName?: string = "default";
       provisioningState: ResourceState;
     }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource,FooResourceProperties> {
      }
    }

    namespace Other {
      @@armProviderNamespace(Microsoft.Test, "Private.Test");
    }
    `);

    const resources = getArmResources(program);
    const foo = resources[0];
    strictEqual(foo.armProviderNamespace, "Private.Test");
  });
  it("gathers metadata about ProxyResources", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

     model FooResourceProperties {
       displayName?: string = "default";
       provisioningState: ResourceState;
     }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource,FooResourceProperties> {
      }

      model BarResourceProperties {
        iAmBar: string;
        provisioningState: ResourceState;
      }

      @parentResource(FooResource)
      model BarResource is ProxyResource<BarResourceProperties> {
        @key("barName")
        @segment("bars")
        @path
        name: string;
      }

      @armResourceOperations
      interface Bars extends ProxyResourceOperations<BarResource> {
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 2);

    const bar = resources[1];
    strictEqual(bar.name, "BarResource");
    strictEqual(bar.kind, "Proxy");
    strictEqual(bar.collectionName, "bars");
    strictEqual(bar.keyName, "barName");
    strictEqual(bar.armProviderNamespace, "Microsoft.Test");

    // Check operations
    assertLifecycleOperation(bar, "read", "Bars");
    assertLifecycleOperation(bar, "createOrUpdate", "Bars");
    assertLifecycleOperation(bar, "delete", "Bars");
  });

  it("gathers metadata about ExtensionResources", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

     model BazResourceProperties {
       displayName?: string = "default";
       provisioningState: ResourceState;
     }

      model BazResource is ExtensionResource<BazResourceProperties> {
        @key("bazName")
        @segment("bazs")
        @path
        name: string;
      }

      @armResourceOperations
      interface Bazs extends ExtensionResourceOperations<BazResource, BazResourceProperties> {
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 1);

    const baz = resources[0];
    strictEqual(baz.name, "BazResource");
    strictEqual(baz.kind, "Extension");
    strictEqual(baz.collectionName, "bazs");
    strictEqual(baz.keyName, "bazName");
    strictEqual(baz.armProviderNamespace, "Microsoft.Test");

    // Check operations
    assertLifecycleOperation(baz, "read", "Bazs");
    assertLifecycleOperation(baz, "createOrUpdate", "Bazs");
    assertLifecycleOperation(baz, "update", "Bazs");
    assertLifecycleOperation(baz, "delete", "Bazs");
  });

  it("gathers metadata about singleton resources", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

     model FooResourceProperties {
       displayName?: string = "default";
       provisioningState: ResourceState;
     }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      
      @armResourceOperations
      #suppress "deprecated" "test"
      interface Foos extends ResourceCreate<FooResource>,ResourceRead<FooResource>,ResourceDelete<FooResource> {}

      model BarResourceProperties {
        iAmBar: string;
        provisioningState: ResourceState;
      }

      @singleton
      @parentResource(FooResource)
      model BarResource is ProxyResource<BarResourceProperties> {
        @key("barName")
        @segment("bars")
        @path
        name: string;
      }

      @armResourceOperations
      interface Bars extends ProxyResourceOperations<BarResource> {
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 2);

    const bar = resources[1];
    strictEqual(bar.name, "BarResource");
    strictEqual(bar.kind, "Proxy");
    strictEqual(bar.collectionName, "bars");
    strictEqual(bar.keyName, "barName");
    strictEqual(bar.armProviderNamespace, "Microsoft.Test");

    // Check operations
    assertLifecycleOperation(bar, "read", "Bars");
    assertLifecycleOperation(bar, "createOrUpdate", "Bars");
    assertLifecycleOperation(bar, "delete", "Bars");
  });

  it("gathers metadata when overriding lifecycle operation", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model FooResourceProperties {
        iAmFoo: string;
        provisioningState: ResourceState;
      }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
        update is ArmTagsPatchAsync<FooResource, FooResourceProperties>;
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 1);

    const foo = resources[0];
    strictEqual(foo.name, "FooResource");
    strictEqual(foo.kind, "Tracked");
    strictEqual(foo.collectionName, "foos");
    strictEqual(foo.keyName, "fooName");
    strictEqual(foo.armProviderNamespace, "Microsoft.Test");

    // Check operations
    assertLifecycleOperation(foo, "read", "Foos");
    assertLifecycleOperation(foo, "createOrUpdate", "Foos");
    assertLifecycleOperation(foo, "update", "Foos");
    assertLifecycleOperation(foo, "delete", "Foos");
  });

  it("resources with intrinsic types", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model BaseResourceProperties {
        commonType: string;
        provisioningState: ResourceState;
      }

      model FooResourceProperties extends BaseResourceProperties {
        iAmFoo: string;

        int32Prop: int32;

        int64Prop: int64;

        safeIntProp: safeint;

        f32Prop: float32;

        f64Prop: float64;

        boolProp: boolean;

        dateProp: plainDate;

        timeProp: plainTime;

        utcDateTimeProp: utcDateTime;

        durationProp: duration;

        mapProp: Record<string>;

        arrint32Prop: int32[];

        arrint64Prop: int64[];

        arrsafeIntProp: safeint[];

        arrayF32Prop: float32[];

        arrayF64Prop: float64[];

        arrayBoolProp: boolean[];

        arrdateProp: plainDate[];

        arrtimeProp: plainTime[];

        arrutcDateTimeProp: utcDateTime[];

        arrdurationProp: duration[];
      }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 1);
    const foo = resources[0];
    strictEqual(foo.name, "FooResource");
    strictEqual(foo.kind, "Tracked");
    strictEqual(foo.collectionName, "foos");
    strictEqual(foo.keyName, "fooName");
    strictEqual(foo.armProviderNamespace, "Microsoft.Test");
  });

  it("resources with armResourceIdentifier property types", async () => {
    const { program } = await Tester.compile(`
      @armProviderNamespace
              namespace Microsoft.Test;

      enum ResourceState {
        Succeeded,
        Canceled,
        Failed
     }

      model FooResourceProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;
        armIdWithType: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type"}]>;
        armIdWithTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}]>;
        armIdWithMultipleTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["Tenant", "ResourceGroup"]}]>;
        provisioningState: ResourceState;
      }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
    `);

    const resources = getArmResources(program);
    strictEqual(resources.length, 1);

    const foo = resources[0];
    strictEqual(foo.name, "FooResource");
    strictEqual(foo.kind, "Tracked");
    strictEqual(foo.collectionName, "foos");
    strictEqual(foo.keyName, "fooName");
    strictEqual(foo.armProviderNamespace, "Microsoft.Test");

    const armIds = [
      "simpleArmId",
      "armIdWithType",
      "armIdWithTypeAndScope",
      "armIdWithMultipleTypeAndScope",
    ];
    armIds.forEach(function (id) {
      const armIdProp = getResourcePropertyProperties(foo, id);
      strictEqual((armIdProp?.type as Model).name, "armResourceIdentifier");
    });
  });
  describe("network security perimeter", () => {
    it("raises diagnostic when network security perimeter is used on default common-types version", async () => {
      const diagnostics = await Tester.diagnose(`
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Test;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  v2025_11_19_preview: "2025-11-19-preview",
}

        model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/invalid-version-for-common-type",
      });
    });
    it("raises diagnostic when network security perimeter is used on v3 common-types version", async () => {
      const diagnostics = await Tester.diagnose(`
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Test;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2025_11_19_preview: "2025-11-19-preview",
}

        model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/invalid-version-for-common-type",
      });
    });
    it("raises diagnostic when network security perimeter is used on v4 common-types version", async () => {
      const diagnostics = await Tester.diagnose(`
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Test;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
  v2025_11_19_preview: "2025-11-19-preview",
}

        model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/invalid-version-for-common-type",
      });
    });
    it("raises no diagnostic when network security perimeter is used on v5 common-types version", async () => {
      const diagnostics = await Tester.diagnose(`
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Test;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2025_11_19_preview: "2025-11-19-preview",
}

        model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
      `);

      expectDiagnosticEmpty(diagnostics);
    });
    it("raises no diagnostic when network security perimeter is used on v6 common-types version", async () => {
      const diagnostics = await Tester.diagnose(`
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Test;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2025_11_19_preview: "2025-11-19-preview",
}

        model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
      `);

      expectDiagnosticEmpty(diagnostics);
    });
  });
  describe("raises diagnostics", () => {
    it("when armResourceInternal is used on a non-resource type", async () => {
      const diagnostics = await Tester.diagnose(`
        @armProviderNamespace
              namespace Microsoft.Test;

        model FooResourceProperties {}

        // NOTE: No spec author should actually use this directly
        @Azure.ResourceManager.Private.armResourceInternal(FooResourceProperties)
        model FooResource {
          @key("fooName")
          @segment("foos")
          @path
          name: string;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-base-type",
      });
    });

    it("when name property doesn't have a @key decorator", async () => {
      const diagnostics = await Tester.diagnose(`
        @armProviderNamespace
              namespace Microsoft.Test;

        model FooResourceProperties {}

        model FooResource is TrackedResource<FooResourceProperties> {
          @segment("foos")
          @path
          name: string;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing-name-key-decorator",
      });
    });

    it("when name property doesn't have a @segment decorator", async () => {
      const diagnostics = await Tester.diagnose(`
        @armProviderNamespace
              namespace Microsoft.Test;

        model FooResourceProperties {}

        model FooResource is TrackedResource<FooResourceProperties> {
          @key("fooName")
          @path
          name: string;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing-name-segment-decorator",
      });
    });
  });
});

it("emits correct extended location for resource", async () => {
  const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget>;
         ...ExtendedLocationProperty;
      }

      model WidgetProperties {
         size: int32;
      }
  `);
  const resources = getArmResources(program);
  strictEqual(resources.length, 1);
  ok(resources[0].typespecType.properties.has("extendedLocation"));
});

it("emits correct fixed union name parameter for resource", async () => {
  const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget, Type=WidgetNameType>;
      }

      model WidgetProperties {
         size: int32;
      }

      union WidgetNameType {
        string,
        Small: "Small",
        Large: "Large"
      }
  `);
  const resources = getArmResources(program);
  strictEqual(resources.length, 1);
  ok(resources[0].typespecType.properties.has("name"));
  const nameProperty = resources[0].typespecType.properties.get("name");
  strictEqual(nameProperty?.type.kind, "Union");
  strictEqual(nameProperty?.type.name, "WidgetNameType");
});

it("emits a scalar string with decorator parameter for resource", async () => {
  const { program } = await Tester.compile(`
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget, Type=WidgetNameType>;
      }

      model WidgetProperties {
         size: int32;
      }

      @minLength(1)
      @maxLength(10)
      @pattern("xxxxxx")
      scalar WidgetNameType extends string;
  `);
  const resources = getArmResources(program);
  strictEqual(resources.length, 1);
  ok(resources[0].typespecType.properties.has("name"));
  const nameProperty = resources[0].typespecType.properties.get("name");
  strictEqual(nameProperty?.type.kind, "Scalar");
  strictEqual(nameProperty?.type.name, "WidgetNameType");
});
it("allows foreign resources as parent resources", async () => {
  const { program } = await Tester.compile(`
using Azure.Core;
@armProviderNamespace
@service
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)

namespace Microsoft.ContosoProviderHub;
@armVirtualResource
@parentResource(RestorePointCollection)
model RestorePoint {
  ...ResourceNameParameter<RestorePoint, "restorePointName", "restorePoints">;
}

@armVirtualResource
model RestorePointCollection {
  ...ResourceNameParameter<
    RestorePointCollection,
    "collectionName",
    "restorePointGroups"
  >;
}

@parentResource(RestorePoint)
model DiskRestorePoint is TrackedResource<DiskRestorePointProperties> {
  ...ResourceNameParameter<DiskRestorePoint>;
}

model DiskRestorePointProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

model MoveRequest {
  from: string;
  to: string;
}

model MoveResponse {
  movingStatus: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface DiskRestorePoints {
  get is ArmResourceRead<DiskRestorePoint>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<DiskRestorePoint>;
  update is ArmCustomPatchSync<
    DiskRestorePoint,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      DiskRestorePoint,
      DiskRestorePointProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<DiskRestorePoint>;
  list is ArmResourceListByParent<DiskRestorePoint>;

  move is ArmResourceActionSync<DiskRestorePoint, MoveRequest, MoveResponse>;

  checkExistence is ArmResourceCheckExistence<DiskRestorePoint>;
}

@armResourceOperations
interface RestorePointOperations {
  moveR is ArmResourceActionAsync<RestorePoint, MoveRequest, MoveResponse>;
}

    `);

  const resources = getArmResources(program);
  expect(resources.length).toBe(3);
  const restorePoint = resources.find((r) => r.name === "RestorePoint");
  expect(restorePoint).toBeDefined();
  expect(restorePoint?.operations.actions.moveR).toBeDefined();
  const restorePointCollection = resources.find((r) => r.name === "RestorePointCollection");
  expect(restorePointCollection).toBeDefined();
  const diskRestorePoint = resources.find((r) => r.name === "DiskRestorePoint");
  expect(diskRestorePoint).toBeDefined();
});

it("allows extension of foreign resources", async () => {
  const { program, Employees, ManagementGroups, VirtualMachines } = await Tester.compile(t.code`
using Azure.Core;

@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.ContosoProviderHub;

model Employee is ExtensionResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  string,
}

interface Operations extends Azure.ResourceManager.Operations {}

interface EmplOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  get is Extension.Read<Scope, Employee>;

  create is Extension.CreateOrReplaceAsync<Scope, Employee>;
  update is Extension.CustomPatchSync<
    Scope,
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is Extension.DeleteWithoutOkAsync<Scope, Employee>;
  list is Extension.ListByTarget<Scope, Employee>;
  move is Extension.ActionSync<Scope, Employee, MoveRequest, MoveResponse>;
}

alias VirtualMachine = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachines",
  "vmName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine"
>;


@armResourceOperations
interface ${t.interface("Employees")} extends EmplOps<Extension.ScopeParameter> {}
@armResourceOperations
interface ${t.interface("ManagementGroups")} extends EmplOps<Extension.ManagementGroup> {}
@armResourceOperations
interface ${t.interface("VirtualMachines")} extends EmplOps<VirtualMachine> {}


model MoveRequest {
  from: string;
  to: string;
}

model MoveResponse {
  movingStatus: string;
}

    `);

  const employeesGet: Operation | undefined = Employees?.operations?.get("get");
  ok(employeesGet);
  const [employeeGetHttp, _e] = getHttpOperation(program, employeesGet);
  expect(employeeGetHttp.path).toBe(
    "/{scope}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
  const managementGet: Operation | undefined = ManagementGroups?.operations?.get("get");
  ok(managementGet);
  const [managementGetHttp, _m] = getHttpOperation(program, managementGet);
  expect(managementGetHttp.path).toBe(
    "/providers/Microsoft.Management/managementGroups/{managementGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
  const virtualMachinesGet: Operation | undefined = VirtualMachines?.operations?.get("get");
  ok(virtualMachinesGet);
  const [vmGetHttp, _v] = getHttpOperation(program, virtualMachinesGet);
  expect(vmGetHttp.path).toBe(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
});

it("overrides provider namespace in mixed legacy and resource operations", async () => {
  const { program, get, checkExistence } = await Tester.compile(t.code`
using Azure.Core;

@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)

namespace Microsoft.ContosoProviderHub;

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

interface EmplOps extends Azure.ResourceManager.Legacy.LegacyOperations<
BaseParams & {...ParentKeysOf<Employee>},
{...KeysOf<Employee>}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  };


@armResourceOperations
interface Employees {
  ${t.op("get")} is EmplOps.Read<Employee>;
  ${t.op("checkExistence")} is Azure.ResourceManager.ArmResourceCheckExistence<Employee>;
}
    `);

  const [employeeGetHttp, _e] = getHttpOperation(program, get);
  expect(employeeGetHttp.path).toBe(
    "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );

  const [existenceHttp, _m] = getHttpOperation(program, checkExistence);
  expect(existenceHttp.path).toBe(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
});

it("uses route override in routed operations", async () => {
  const { program, get, checkExistence } = await Tester.compile(t.code`
using Azure.Core;

@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)

namespace Microsoft.ContosoProviderHub;

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

interface EmplOps extends Azure.ResourceManager.Legacy.RoutedOperations<
BaseParams & {...ParentKeysOf<Employee>},
{...KeysOf<Employee>}, ErrorResponse, #{useStaticRoute: true, route: "/subscriptions/{subscriptionId}/providers/Microsoft.Overridden/employees"}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
  };

@armResourceOperations(#{ allowStaticRoutes: true})
interface Employees {
  ${t.op("get")} is EmplOps.Read<Employee>;
  ${t.op("checkExistence")} is Azure.ResourceManager.ArmResourceCheckExistence<Employee>;
}
    `);

  const [employeeGetHttp, _e] = getHttpOperation(program, get);
  expect(employeeGetHttp.path).toBe(
    "/subscriptions/{subscriptionId}/providers/Microsoft.Overridden/employees/{employeeName}",
  );

  const [existenceHttp, _m] = getHttpOperation(program, checkExistence);
  expect(existenceHttp.path).toBe(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
});

it("overrides provider namespace in custom operations", async () => {
  const { program, get, checkExistence } = await Tester.compile(t.code`
using Azure.Core;

@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.ContosoProviderHub;

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

interface EmplOps extends Azure.ResourceManager.Legacy.LegacyOperations<
  BaseParams & {...ParentKeysOf<Employee>},
  {...KeysOf<Employee>}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  };


@armResourceOperations
interface Employees {
  @armResourceRead(Employee)
  @get op ${t.op("get")}(...BaseParams, ...KeysOf<Employee>): Employee;
  
  ${t.op("checkExistence")} is Azure.ResourceManager.ArmResourceCheckExistence<Employee>;
}
    `);

  const [employeeGetHttp, _e] = getHttpOperation(program, get);
  expect(employeeGetHttp.path).toBe(
    "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );

  const [existenceHttp, _m] = getHttpOperation(program, checkExistence);
  expect(existenceHttp.path).toBe(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
});

it("overrides provider namespace in legacy operations", async () => {
  const { program, get } = await Tester.compile(t.code`
using Azure.Core;

@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.ContosoProviderHub;

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

interface EmplOps extends Azure.ResourceManager.Legacy.LegacyOperations<
  BaseParams & {...ParentKeysOf<Employee>},
  {...KeysOf<Employee>}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  };


@armResourceOperations
interface Employees {
  ${t.op("get")} is EmplOps.Read<Employee>;
}
    `);

  const [employeeGetHttp, _] = getHttpOperation(program, get);
  expect(employeeGetHttp.path).toBe(
    "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
  );
});

it("emits diagnostics for non ARM resources", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      namespace Microsoft.Contoso {
        @parentResource(Microsoft.Person.Contoso.Person)
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }
      
        model EmployeeProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: ResourceProvisioningState;
        }
      
        @armResourceOperations
        interface Employees {
          listByResourceGroup is ArmResourceListByParent<Employee>;
        }
      }
        
      namespace Microsoft.Person.Contoso {
        model Person {
          @path
          @visibility(Lifecycle.Read)
          @segment("parents")
          @key
          name: string;
        }
      }
`);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing",
      message: "No @armResource registration found for type Person",
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/parent-type",
      message: "Parent type Person of Employee is not registered as an ARM resource type.",
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing",
      message: "No @armResource registration found for type Person",
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/parent-type",
      message: "Parent type Person of Employee is not registered as an ARM resource type.",
    },
  ]);
});

it("emits default optional properties for resource", async () => {
  const { program } = await Tester.compile(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model Widget is TrackedResource<WidgetProperties> {
       ...ResourceNameParameter<Widget>;
    }

    model WidgetProperties {
       size: int32;
    }
`);
  const resources = getArmResources(program);
  strictEqual(resources.length, 1);
  strictEqual(resources[0].typespecType.properties.get("properties")?.optional, true);
});

it("emits required properties for resource with @armResourcePropertiesOptionality override ", async () => {
  const { program } = await Tester.compile(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model Widget is ProxyResource<WidgetProperties, false> {
       ...ResourceNameParameter<Widget>;
    }

    model WidgetProperties {
       size: int32;
    }
`);
  const resources = getArmResources(program);
  strictEqual(resources.length, 1);
  strictEqual(resources[0].typespecType.properties.get("properties")?.optional, false);
});

it("recognizes resource with customResource identifier", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
      namespace Microsoft.Contoso {
     @parentResource(Microsoft.Person.Contoso.Person)
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
    
      model EmployeeProperties {
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }
    
      union ProvisioningState {
        string,
    
        Succeeded: "Succeeded",
    
        Failed: "Failed",
    
        Canceled: "Canceled",
      }
    
      interface Operations extends Azure.ResourceManager.Operations {}
    
      @armResourceOperations
      interface Employees {
        listByResourceGroup is ArmResourceListByParent<Employee>;
      }
    }
    
    namespace Microsoft.Person.Contoso {
      @Azure.ResourceManager.Legacy.customAzureResource
      model Person {
        name: string;
      }
    }
`);
  expectDiagnosticEmpty(diagnostics);
});
