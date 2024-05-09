import { Model } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { ArmLifecycleOperationKind } from "../src/operations.js";
import { ArmResourceDetails, getArmResources } from "../src/resource.js";
import { checkFor } from "./test-host.js";

function assertLifecycleOperation(
  resource: ArmResourceDetails,
  kind: ArmLifecycleOperationKind,
  operationGroup: string
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
      @service({title: "Microsoft.Test"})
      
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
      @service({title: "Microsoft.Test"})
      
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
        armIdWithTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}]>;
        armIdWithMultipleTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["tenant", "resourceGroup"]}]>;
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
});
