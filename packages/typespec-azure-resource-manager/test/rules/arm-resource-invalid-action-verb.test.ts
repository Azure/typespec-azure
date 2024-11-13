import { Operation } from "@typespec/compiler";
import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { armResourceInvalidActionVerbRule } from "../../src/rules/arm-resource-invalid-action-verb.js";
import { listBySubscriptionRule } from "../../src/rules/list-operation.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: detect non-post actions", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceInvalidActionVerbRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });
  it("Detects non-post/non-get actions", async () => {
    await tester
      .expect(
        `
    @service({title: "Microsoft.Foo"})
    @versioned(Versions)
    @armProviderNamespace
    namespace Microsoft.Foo;

      @doc(".")
      enum Versions {
        @doc(".")
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
        v2021_09_21: "2022-09-21-preview",
        @doc(".")
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
        v2022_01_10: "2022-01-10-alpha.1"
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("Foo resource")
      model FooResource is TrackedResource<FooProperties> {
        @visibility("read")
        @doc("The name of the all properties resource.")
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceCreate<FooResource>,ResourceDelete<FooResource> {
          @doc("Gets my Foos")
          @armResourceRead(FooResource)
          @action @delete deleteFooAction(...ResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
        }

        @doc("The state of the resource")
        enum ResourceState {
         @doc(".") Succeeded,
         @doc(".") Canceled,
         @doc(".") Failed
       }

       @doc("Foo resource")
       model FooProperties {
         @doc("Name of the resource")
         displayName?: string = "default";
         @doc("The provisioning State")
         provisioningState: ResourceState;
       }
    `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb",
        message: "Actions must be HTTP Post or Get operations.",
      });
  });

  it("Allows get actions for provider actions", async () => {
    await tester
      .expect(
        `
    @armProviderNamespace
    @service({title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Foo;
    enum Versions {
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The VM Size")
      model VmSize {
        @doc("number of cpus ")
        cpus: int32;
      }

      @armResourceOperations
      interface ProviderOperations {
        @get
        @armResourceList(VmSize)
        getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      }
    `,
      )
      .toBeValid();
  });

  it("Allows post actions for any provider", async () => {
    await tester
      .expect(
        `
    @armProviderNamespace
    @service({title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Foo;
    enum Versions {
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The VM Size")
      model VmSize {
        @doc("number of cpus ")
        cpus: int32;
      }

      @armResourceOperations
      interface ProviderOperations {
        @post
        @armResourceList(VmSize)
        getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      }
    `,
      )
      .toBeValid();
  });
});

describe("typespec-azure-resource-manager: generates armResourceAction paths correctly", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
  });
  it("Generates armResourceAction paths correctly", async () => {
    const [results, _] = await runner.compileAndDiagnose(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      interface Operations extends Azure.ResourceManager.Operations {}

      @Azure.ResourceManager.tenantResource
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
        @doc("The color of the widget")
        color: string;
      }

      @armResourceOperations(Widget)
      interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
        @test
        @autoRoute
        @doc("Flip to the opposite of the current spin")
        @action("correctPattern")
        @post
        @armResourceAction(Widget)
        thisIsTheCorrectPattern(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;

        @test
        @autoRoute
        @doc("Flip to the opposite of the current spin")
        @post
        @armResourceAction(Widget)
        DefaultToCamelCase(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
      }
      `,
    );

    strictEqual(
      getHttpOperation(runner.program, results.thisIsTheCorrectPattern as Operation)[0].path,
      "/providers/Microsoft.Contoso/widgets/{widgetName}/correctPattern",
    );

    strictEqual(
      getHttpOperation(runner.program, results.DefaultToCamelCase as Operation)[0].path,
      "/providers/Microsoft.Contoso/widgets/{widgetName}/defaultToCamelCase",
    );
  });
});

describe("typespec-azure-resource-manager: generates provider paths correctly", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
  });

  it("Generates provider paths correctly", async () => {
    const [results, _] = await runner.compileAndDiagnose(
      `
    @armProviderNamespace
    @service({title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Contoso;
    enum Versions {
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The VM Size")
      model VmSize {
        @doc("number of cpus ")
        cpus: int32;
      }

      @armResourceOperations
      interface ProviderOperations {
        @get
        @armResourceRead(VmSize)
        @test
        @autoRoute
        getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
        
        @get
        @armResourceRead(VmSize)
        @test
        @autoRoute
        getVmsSizesAtLocation is ArmProviderActionSync<void, VmSize, SubscriptionActionScope, Parameters= LocationParameter>;
        
        @get
        @armResourceRead(VmSize)
        @test
        @autoRoute
        @action("logAnalytics/apiAccess/getThrottledRequests")
        getThrottledRequests is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      }
      `,
    );

    strictEqual(
      getHttpOperation(runner.program, results.getVmsSizes as Operation)[0].path,
      "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/getVmsSizes",
    );

    strictEqual(
      getHttpOperation(runner.program, results.getVmsSizesAtLocation as Operation)[0].path,
      "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/locations/{location}/getVmsSizesAtLocation",
    );

    strictEqual(
      getHttpOperation(runner.program, results.getThrottledRequests as Operation)[0].path,
      "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/logAnalytics/apiAccess/getThrottledRequests",
    );
  });
});

describe("typespec-azure-resource-manager: generates tenant paths correctly", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
  });

  it("Generates tenant paths correctly", async () => {
    const [results, _] = await runner.compileAndDiagnose(
      `
    @armProviderNamespace
    @service({title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Contoso;
    enum Versions {
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The core size")
      model CoresSize {
        @doc("number of free cores ")
        available: int32;
      }

      @armResourceOperations
      interface ProviderOperations {
        @get
        @test
        @autoRoute
        @armResourceRead(CoresSize)
        getCores is ArmProviderActionSync<void, CoresSize, TenantActionScope>;
      }
      `,
    );

    strictEqual(
      getHttpOperation(runner.program, results.getCores as Operation)[0].path,
      "/providers/Microsoft.Contoso/getCores",
    );
  });
});

describe("typespec-azure-resource-manager: improper list by subscription operation", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      listBySubscriptionRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("Emits a warning if a tenant or extension resource lists by subscription", async () => {
    await tester
      .expect(
        `
    @service({title: "Microsoft.Foo"})
    
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Foo;


      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("Foo resource")
      @tenantResource
      model FooResource is ProxyResource<FooProperties> {
        @visibility("read")
        @doc("The name of the all properties resource.")
        @key("foo")
        @segment("foo")
        @path
        name: string;
      }

      @armResourceOperations(FooResource)
      interface FooResources extends ResourceRead<FooResource> {
        op listBySubscription is ArmListBySubscription<FooResource>;
      }

        @doc("The state of the resource")
        enum ResourceState {
         @doc(".") Succeeded,
         @doc(".") Canceled,
         @doc(".") Failed
       }

       @doc("Foo resource")
       model FooProperties {
         @doc("Name of the resource")
         displayName?: string = "default";
         @doc("The provisioning State")
         provisioningState: ResourceState;
       }
    `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/improper-subscription-list-operation",
        message:
          "Tenant and Extension resources should not define a list by subscription operation.",
      });
  });
});
