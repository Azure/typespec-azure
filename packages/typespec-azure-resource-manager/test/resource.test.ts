import { Model } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { ArmLifecycleOperationKind } from "../src/operations.js";
import { ArmResourceDetails, getArmResources } from "../src/resource.js";
import { checkFor } from "./test-host.js";

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

describe("typespec-azure-resource-manager: ARM resource model", () => {
  describe("ARM resource model:", () => {
    it("gathers metadata about TrackedResources", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

      @doc("Resource properties")
      model FooResourceProperties {
        @doc("I am foo")
        iAmFoo: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
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
      expectDiagnosticEmpty(diagnostics);
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
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @service(#{title: "Microsoft.Test"})
      
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test {

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Foo properties")
     model FooResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
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

      expectDiagnosticEmpty(diagnostics);
      const resources = getArmResources(program);
      const foo = resources[0];
      strictEqual(foo.armProviderNamespace, "Private.Test");
    });
    it("gathers metadata about ProxyResources", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @service(#{title: "Microsoft.Test"})
      
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Foo properties")
     model FooResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource,FooResourceProperties> {
      }

      @doc("Bar properties")
      model BarResourceProperties {
        @doc("I am Bar")
        iAmBar: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Bar resource")
      @parentResource(FooResource)
      model BarResource is ProxyResource<BarResourceProperties> {
        @doc("Bar name")
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
      expectDiagnosticEmpty(diagnostics);
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
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Baz properties")
     model BazResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Baz resource")
      model BazResource is ExtensionResource<BazResourceProperties> {
        @doc("Baz name")
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
      expectDiagnosticEmpty(diagnostics);
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
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Foo properties")
     model FooResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      
      @armResourceOperations
      #suppress "deprecated" "test"
      interface Foos extends ResourceCreate<FooResource>,ResourceRead<FooResource>,ResourceDelete<FooResource> {}

      @doc("Bar properties")
      model BarResourceProperties {
        @doc("I am bar")
        iAmBar: string;
        @doc("The provisioning State")
       provisioningState: ResourceState;
      }

      @doc("Bar resource")
      @singleton
      @parentResource(FooResource)
      model BarResource is ProxyResource<BarResourceProperties> {
        @doc("Bar name")
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
      expectDiagnosticEmpty(diagnostics);
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
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

      @doc("Resource properties")
      model FooResourceProperties {
        @doc("I am foo")
        iAmFoo: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
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
      expectDiagnosticEmpty(diagnostics);
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
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

      @doc("Base resource properties")
      model BaseResourceProperties {
        @doc("Common type")
        commonType: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo properties")
      model FooResourceProperties extends BaseResourceProperties {
        @doc("I am Foo")
        iAmFoo: string;

        @doc("Int prop")
        int32Prop: int32;

        @doc("Another int prop")
        int64Prop: int64;

        @doc("Safe int prop")
        safeIntProp: safeint;

        @doc("Float 32 prop")
        f32Prop: float32;

        @doc("Float 64 prop")
        f64Prop: float64;

        @doc("Bool prop")
        boolProp: boolean;

        @doc("Date prop")
        dateProp: plainDate;

        @doc("Time prop")
        timeProp: plainTime;

        @doc("Zoned date prop")
        utcDateTimeProp: utcDateTime;

        @doc("Duration prop")
        durationProp: duration;

        @doc("Map prop")
        mapProp: Record<string>;

        @doc("Arr 32 prop")
        arrint32Prop: int32[];

        @doc("Arr 64 prop")
        arrint64Prop: int64[];

        @doc("Arr safe prop")
        arrsafeIntProp: safeint[];

        @doc("Arr F32 prop")
        arrayF32Prop: float32[];

        @doc("Arr F64 prop")
        arrayF64Prop: float64[];

        @doc("Arr Bool prop")
        arrayBoolProp: boolean[];

        @doc("Arr Date prop")
        arrdateProp: plainDate[];

        @doc("Arr time prop")
        arrtimeProp: plainTime[];

        @doc("Arr zoned prop")
        arrutcDateTimeProp: utcDateTime[];

        @doc("Arr duration prop")
        arrdurationProp: duration[];
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
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
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 1);

      const foo = resources[0];
      strictEqual(foo.name, "FooResource");
      strictEqual(foo.kind, "Tracked");
      strictEqual(foo.collectionName, "foos");
      strictEqual(foo.keyName, "fooName");
      strictEqual(foo.armProviderNamespace, "Microsoft.Test");
    });

    it("resources with armResourceIdentifier property types", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
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
      expectDiagnosticEmpty(diagnostics);
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

    describe("raises diagnostics", () => {
      it("when armResourceInternal is used on a non-resource type", async () => {
        const { diagnostics } = await checkFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Test;

        model FooResourceProperties {}

        // NOTE: No spec author should actually use this directly
        @doc("Foo resource")
        @Azure.ResourceManager.Private.armResourceInternal(FooResourceProperties)
        model FooResource {
          @doc("Foo name")
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
        const { diagnostics } = await checkFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Test;

        model FooResourceProperties {}

        @doc("Foo resource")
        model FooResource is TrackedResource<FooResourceProperties> {
          @doc("Foo name")
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
        const { diagnostics } = await checkFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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
    const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget>;
         ...ExtendedLocationProperty;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }
  `);
    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    strictEqual(resources.length, 1);
    ok(resources[0].typespecType.properties.has("extendedLocation"));
  });

  it("emits correct fixed union name parameter for resource", async () => {
    const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget, Type=WidgetNameType>;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }

      /** different type of widget used on resource path */
      union WidgetNameType {
        string,
        /** small widget */
        Small: "Small",
        /** large widget */        
        Large: "Large"
      }
  `);
    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    strictEqual(resources.length, 1);
    ok(resources[0].typespecType.properties.has("name"));
    const nameProperty = resources[0].typespecType.properties.get("name");
    strictEqual(nameProperty?.type.kind, "Union");
    strictEqual(nameProperty?.type.name, "WidgetNameType");
  });

  it("emits a scalar string with decorator parameter for resource", async () => {
    const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget, Type=WidgetNameType>;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }

      @minLength(1)
      @maxLength(10)
      @pattern("xxxxxx")
      scalar WidgetNameType extends string;
  `);
    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    strictEqual(resources.length, 1);
    ok(resources[0].typespecType.properties.has("name"));
    const nameProperty = resources[0].typespecType.properties.get("name");
    strictEqual(nameProperty?.type.kind, "Scalar");
    strictEqual(nameProperty?.type.name, "WidgetNameType");
  });
  it("allows foreign resources as parent resources", async () => {
    const { program, diagnostics } = await checkFor(`
using Azure.Core;
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)

namespace Microsoft.ContosoProviderHub;
/** Externally defined RestorePoint */
@armVirtualResource
@parentResource(RestorePointCollection)
model RestorePoint {
  ...ResourceNameParameter<RestorePoint, "restorePointName", "restorePoints">;
}

/** Externally defined RestorePointCollection */
@armVirtualResource
model RestorePointCollection {
  ...ResourceNameParameter<
    RestorePointCollection,
    "collectionName",
    "restorePointGroups"
  >;
}

/** A ContosoProviderHub resource */
@parentResource(RestorePoint)
model DiskRestorePoint is TrackedResource<DiskRestorePointProperties> {
  ...ResourceNameParameter<DiskRestorePoint>;
}

/** Employee properties */
model DiskRestorePointProperties {
  /** Age of employee */
  age?: int32;

  /** City of employee */
  city?: string;

  /** Profile of employee */
  @encode("base64url")
  profile?: bytes;

  /** The status of the last operation. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The provisioning state of a resource. */
@lroStatus
union ProvisioningState {
  string,

  /** The resource create request has been accepted */
  Accepted: "Accepted",

  /** The resource is being provisioned */
  Provisioning: "Provisioning",

  /** The resource is updating */
  Updating: "Updating",

  /** Resource has been created. */
  Succeeded: "Succeeded",

  /** Resource creation failed. */
  Failed: "Failed",

  /** Resource creation was canceled. */
  Canceled: "Canceled",

  /** The resource is being deleted */
  Deleting: "Deleting",
}

/** Employee move request */
model MoveRequest {
  /** The moving from location */
  from: string;

  /** The moving to location */
  to: string;
}

/** Employee move response */
model MoveResponse {
  /** The status of the move */
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

  /** A sample resource action that move employee to different location */
  move is ArmResourceActionSync<DiskRestorePoint, MoveRequest, MoveResponse>;

  /** A sample HEAD operation to check resource existence */
  checkExistence is ArmResourceCheckExistence<DiskRestorePoint>;
}

@armResourceOperations
interface RestorePointOperations {
  moveR is ArmResourceActionAsync<RestorePoint, MoveRequest, MoveResponse>;
}

    `);

    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    expect(resources.length).toBe(3);
    const restorePoint = resources.find((r) => r.name === "RestorePoint");
    expect(restorePoint).toBeDefined();
    expect(restorePoint?.operations.actions.moveR).toBeDefined();
    const restorePointCollection = resources.find((r) => r.name === "RestorePointCollection");
    expect(restorePointCollection).toBeDefined();
    const diskRestorePoint = resources.find((r) => r.name === "DiskRestorePoint");
    expect(diskRestorePoint).toBeDefined();
  });

  it("emits diagnostics for non ARM resources", async () => {
    const { diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso {
       @parentResource(Microsoft.Person.Contoso.Person)
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }
      
        /** Employee properties */
        model EmployeeProperties {
          /** The status of the last operation. */
          @visibility(Lifecycle.Read)
          provisioningState?: ProvisioningState;
        }
      
        /** The provisioning state of a resource. */
        union ProvisioningState {
          string,
      
          /** Resource has been created. */
          Succeeded: "Succeeded",
      
          /** Resource creation failed. */
          Failed: "Failed",
      
          /** Resource creation was canceled. */
          Canceled: "Canceled",
        }
      
        interface Operations extends Azure.ResourceManager.Operations {}
      
        @armResourceOperations
        interface Employees {
          listByResourceGroup is ArmResourceListByParent<Employee>;
        }
      }
        
      namespace Microsoft.Person.Contoso {
        /** Person parent */
        model Person {
          /** The parent name */
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
});

it("emits default optional properties for resource", async () => {
  const { program, diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is TrackedResource<WidgetProperties> {
       ...ResourceNameParameter<Widget>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
       size: int32;
    }
`);
  const resources = getArmResources(program);
  expectDiagnosticEmpty(diagnostics);
  strictEqual(resources.length, 1);
  strictEqual(resources[0].typespecType.properties.get("properties")?.optional, true);
});

it("emits required properties for resource with @armResourcePropertiesOptionality override ", async () => {
  const { program, diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is ProxyResource<WidgetProperties, false> {
       ...ResourceNameParameter<Widget>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
       size: int32;
    }
`);
  const resources = getArmResources(program);
  expectDiagnosticEmpty(diagnostics);
  strictEqual(resources.length, 1);
  strictEqual(resources[0].typespecType.properties.get("properties")?.optional, false);
});

it("recognizes resource with customResource identifier", async () => {
  const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso {
     @parentResource(Microsoft.Person.Contoso.Person)
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
    
      /** Employee properties */
      model EmployeeProperties {
        /** The status of the last operation. */
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }
    
      /** The provisioning state of a resource. */
      union ProvisioningState {
        string,
    
        /** Resource has been created. */
        Succeeded: "Succeeded",
    
        /** Resource creation failed. */
        Failed: "Failed",
    
        /** Resource creation was canceled. */
        Canceled: "Canceled",
      }
    
      interface Operations extends Azure.ResourceManager.Operations {}
    
      @armResourceOperations
      interface Employees {
        listByResourceGroup is ArmResourceListByParent<Employee>;
      }
    }
    
    namespace Microsoft.Person.Contoso {
      /** Person parent */
      @Azure.ResourceManager.Legacy.customAzureResource
      model Person {
        /** The parent name */
        name: string;
      }
    }
`);
  expectDiagnosticEmpty(diagnostics);
});

describe("typespec-azure-resource-manager: identifiers decorator", () => {
  it("allows multiple model properties in identifiers decorator", async () => {
    const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    model Dog {
      name: string;
      age: int32;
    }
    
    model Pets
    {
      @identifiers(#["name", "age"])
      dogs: Dog[];
    }
`);

    expectDiagnosticEmpty(diagnostics);
  });

  it("allows inner model properties in identifiers decorator", async () => {
    const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    model Dog {
      breed: Breed;
    }
    
    model Breed {
      type: string;
    }
    
    model Pets
    {
      @identifiers(#["breed/type"])
      dogs: Dog[];
    }
`);

    expectDiagnosticEmpty(diagnostics);
  });

  it("emits diagnostic when identifiers is not of a model property object array", async () => {
    const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    model Dog {
      name: string;
    }
    
    model Pets
    {
      @identifiers(#["age"])
      dogs: Dog;
    }
`);

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-resource-manager/decorator-param-wrong-type",
        message:
          "The @identifiers decorator must be applied to a property that is an array of objects",
      },
    ]);
  });
});
