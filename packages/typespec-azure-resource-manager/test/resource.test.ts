import { Diagnostic, Model } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { ArmLifecycleOperationKind } from "../src/operations.js";
import { ArmResourceDetails, getArmResources } from "../src/resource.js";
import { checkFor, getOpenApiAndDiagnostics, openApiFor } from "./test-host.js";

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
      @service({title: "Microsoft.Test", version: "2022-03-01-preview"})
      
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
      @service({title: "Microsoft.Test", version: "2022-03-01-preview"})
      
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

    it("resources with ResourceIdentifier property types", async () => {
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
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("I am a Resource Identifier with type only")
        armIdWithType: ResourceIdentifier<[{type:"Microsoft.RP/type"}]>;

        @doc("I am a a Resource Identifier with type and scopes")
        armIdWithTypeAndScope: ResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}]>;

        @doc("I am a a Resource Identifier with multiple types and scopes")
        armIdWithMultipleTypeAndScope: ResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["tenant", "resourceGroup"]}]>;

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

      const armIds = [
        "simpleArmId",
        "armIdWithType",
        "armIdWithTypeAndScope",
        "armIdWithMultipleTypeAndScope",
      ];
      armIds.forEach(function (id) {
        const armIdProp = getResourcePropertyProperties(foo, id);
        strictEqual((armIdProp?.type as Model).name, "ResourceIdentifier");
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

    describe("emits correct openApi:", () => {
      it("emits correct paths for tenant resources", async () => {
        const openApi = await openApiFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Contoso;

        @doc("Widget resource")
        model Widget is ProxyResource<WidgetProperties> {
          @doc("The name of the widget")
          @key("widgetName")
          @segment("widgets")
          @path
          @visibility("read")
          name: string;
        }

      @doc("The properties of a widget")
      model WidgetProperties {
        @doc("The spin of the widget")
        @knownValues(SpinValues)
        spin?: string;
      }
      
      enum SpinValues {
        up,
        down,
      }
      
      interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
        @autoRoute
        @doc("Flip to the opposite of the current spin")
        @action
        flipSpin(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
      }

      @doc("Flange resource")
      @parentResource(Widget)
      model Flange is ProxyResource<FlangeProperties> {
        @doc("The name of the flange")
        @key("flangeName")
        @segment("flanges")
        @path
        @visibility("read")
        name: string;
      }
      
      @doc("The properties of a Flange")
      model FlangeProperties {
        @doc("The description of the flange")
        description: string;
      
        @doc("The weight in ounces of the flange")
        weight: safeint;
      }
      
      interface Flanges
        extends TenantResourceCreate<Flange>,
          TenantResourceDelete<Flange>,
          TenantResourceRead<Flange>,
          TenantResourceListByParent<Flange> {
        @autoRoute
        @doc("Add a certain amount to the weight")
        @action
        increaseWeight(
          ...TenantInstanceParameters<Flange>,
          increment: safeint
        ): ArmNoContentResponse<"Weight added successfully"> | ErrorResponse;
      }
      `);
        ok(openApi.paths["/providers/Microsoft.Contoso/widgets"].get);
        ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].get);
        ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].put);
        ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].patch);
        ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].delete);
        ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges"].get);
        ok(
          openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}"]
            .get
        );
        ok(
          openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}"]
            .put
        );
        ok(
          openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}"]
            .delete
        );
        ok(
          openApi.paths[
            "/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}/increaseWeight"
          ].post
        );
      });

      it("emits correct paths for checkLocalName endpoints", async () => {
        const openApi = await openApiFor(`
          @armProviderNamespace
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          namespace Microsoft.Contoso;

          @doc("Widget resource")
          model Widget is ProxyResource<WidgetProperties> {
            @doc("The name of the widget")
            @key("widgetName")
            @segment("widgets")
            @path
            @visibility("read")
            name: string;
          }

          @doc("The properties of a widget")
          model WidgetProperties {
            @doc("The spin of the widget")
            @knownValues(SpinValues)
            spin?: string;
          }
      
          enum SpinValues {
            up,
            down,
          }

          interface Widgets extends Operations {
            checkName is checkGlobalNameAvailability;
            checkLocalName is checkLocalNameAvailability;
          }
      `);
        ok(
          openApi.paths[
            "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/checkNameAvailability"
          ].post
        );
        ok(
          openApi.paths[
            "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/locations/{location}/checkNameAvailability"
          ].post
        );
      });

      describe("emits refs for common-types at selected version or earlier versions", () => {
        function assertRef(item: any, refPath: string) {
          ok("$ref" in item);
          strictEqual(item["$ref"], refPath);
        }

        function assertCommonDef(
          openApi: any,
          path: string,
          defName: string,
          version: string,
          file: string
        ) {
          assertRef(
            openApi.paths[path].get.responses["200"].schema,
            `../../common-types/resource-management/${version}/${file}#/definitions/${defName}`
          );
        }

        function assertCommonParam(
          openApi: any,
          path: string,
          paramName: string,
          version: string,
          file: string
        ) {
          assertRef(
            openApi.paths[path].get.parameters[0],
            `../../common-types/resource-management/${version}/${file}#/parameters/${paramName}`
          );
        }

        function assertNotCommonDef(openApi: any, path: string, defName: string) {
          assertRef(openApi.paths[path].get.responses["200"].schema, `#/definitions/${defName}`);
        }

        function assertNotCommonParam(openApi: any, path: string, paramName: string) {
          assertRef(openApi.paths[path].get.parameters[0], `#/parameters/${paramName}`);
        }

        function testCommonTypesVersion(
          version: string | undefined,
          assertFunc: (openApi: any) => void,
          expectedDiagnosticsPerVersion: Partial<Diagnostic>[]
        ) {
          async function runTest(useVersionEnum: boolean): Promise<void> {
            const versions = useVersionEnum ? ["v1", "v2"] : undefined;
            const decorators = `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) ${
              version
                ? `@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.${version})`
                : ""
            }`;
            const nsDecorators = useVersionEnum
              ? `@versioned(Microsoft.Contoso.Versions)`
              : decorators;
            const versionEnum = useVersionEnum
              ? `enum Versions { ${decorators} v1, ${decorators} v2 }`
              : "";

            const [openApi, diagnostics] = await getOpenApiAndDiagnostics(
              `
              @armProviderNamespace
              @service({ title: "Contoso" })
              ${nsDecorators}
              namespace Microsoft.Contoso;

              ${versionEnum}

              @Azure.ResourceManager.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v3, "foo.json")
              model Foo {}

              model FooParam {
                @path
                @Azure.ResourceManager.Private.armCommonParameter("FooParam", Azure.ResourceManager.CommonTypes.Versions.v3, "foo.json")
                foo: string;
              }

              @Azure.ResourceManager.Private.armCommonDefinition("Bar", { version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true }, "bar.json")
              @Azure.ResourceManager.Private.armCommonDefinition("Bar", Azure.ResourceManager.CommonTypes.Versions.v5, "bar-v5.json")
              model Bar {}

              model BarParam {
                @path
                @Azure.ResourceManager.Private.armCommonParameter("BarParam", { version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true }, "bar.json")
                @Azure.ResourceManager.Private.armCommonParameter("BarParam", Azure.ResourceManager.CommonTypes.Versions.v5, "bar-v5.json")
                bar: string;
              }

              @Azure.ResourceManager.Private.armCommonDefinition("Baz", Azure.ResourceManager.CommonTypes.Versions.v5, "baz.json")
              model Baz {}

              model BazParam {
                @path
                @Azure.ResourceManager.Private.armCommonParameter("BazParam", Azure.ResourceManager.CommonTypes.Versions.v5, "baz.json")
                baz: string;
              }

              @route("/foo") op getFoo(...FooParam): Foo;
              @route("/bar") op getBar(...BarParam): Bar;
              @route("/baz") op getBaz(...BazParam): Baz;
              `,
              {},
              versions
            );

            // The same diagnostics will be raised each version the spec is
            // generated for so dynamically generate the expected diagnostic
            // array
            expectDiagnostics(
              diagnostics,
              Array(versions ? versions.length : 1)
                .fill(expectedDiagnosticsPerVersion)
                .flat(1)
            );

            assertFunc(useVersionEnum ? openApi.v2 : openApi);
          }

          it("with version enum", async () => {
            await runTest(true);
          });
          it("with version on namespace", async () => {
            await runTest(false);
          });
        }

        describe("v3", () => {
          testCommonTypesVersion(
            "v3",
            (openApi) => {
              assertCommonDef(openApi, "/foo/{foo}", "Foo", "v3", "foo.json");
              assertCommonParam(openApi, "/foo/{foo}", "FooParam", "v3", "foo.json");

              assertNotCommonDef(openApi, "/bar/{bar}", "Bar");
              assertNotCommonParam(openApi, "/bar/{bar}", "BarParam");
              assertNotCommonDef(openApi, "/baz/{baz}", "Baz");
              assertNotCommonParam(openApi, "/baz/{baz}", "BazParam");
            },
            [
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5, v4",
              },
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5, v4",
              },
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5",
              },
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5",
              },
            ]
          );
        });

        describe("v4", () => {
          testCommonTypesVersion(
            "v4",
            (openApi) => {
              assertCommonDef(openApi, "/foo/{foo}", "Foo", "v3", "foo.json");
              assertCommonParam(openApi, "/foo/{foo}", "FooParam", "v3", "foo.json");
              assertCommonDef(openApi, "/bar/{bar}", "Bar", "v4", "bar.json");
              assertCommonParam(openApi, "/bar/{bar}", "BarParam", "v4", "bar.json");

              assertNotCommonDef(openApi, "/baz/{baz}", "Baz");
              assertNotCommonParam(openApi, "/baz/{baz}", "BazParam");
            },
            [
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v4.  This type only supports the following version(s): v5",
              },
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v4.  This type only supports the following version(s): v5",
              },
            ]
          );
        });

        describe("v5", () => {
          testCommonTypesVersion(
            "v5",
            (openApi) => {
              assertCommonDef(openApi, "/foo/{foo}", "Foo", "v3", "foo.json");
              assertCommonParam(openApi, "/foo/{foo}", "FooParam", "v3", "foo.json");
              assertCommonDef(openApi, "/bar/{bar}", "Bar", "v5", "bar-v5.json");
              assertCommonParam(openApi, "/bar/{bar}", "BarParam", "v5", "bar-v5.json");
              assertCommonDef(openApi, "/baz/{baz}", "Baz", "v5", "baz.json");
              assertCommonParam(openApi, "/baz/{baz}", "BazParam", "v5", "baz.json");
            },
            []
          );
        });

        describe("unspecified version (use defaults)", () => {
          testCommonTypesVersion(
            undefined,
            (openApi) => {
              assertCommonDef(openApi, "/foo/{foo}", "Foo", "v3", "foo.json");
              assertCommonParam(openApi, "/foo/{foo}", "FooParam", "v3", "foo.json");
              assertCommonDef(openApi, "/bar/{bar}", "Bar", "v4", "bar.json");
              assertCommonParam(openApi, "/bar/{bar}", "BarParam", "v4", "bar.json");

              assertNotCommonDef(openApi, "/baz/{baz}", "Baz");
              assertNotCommonParam(openApi, "/baz/{baz}", "BazParam");
            },
            [
              // Only the v5 type gets complained about because the v4 type has isDefault: true
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5",
              },
              {
                code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
                message:
                  "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5",
              },
            ]
          );
        });
      });
    });
  });
});
