import { Operation } from "@typespec/compiler";
import { TesterInstance } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { Tester } from "./tester.js";

let runner: TesterInstance;

beforeEach(async () => {
  runner = await Tester.createInstance();
});

it("Generates armResourceAction paths correctly", async () => {
  const [results, _] = await runner.compileAndDiagnose(
    `
      @armProviderNamespace
          namespace Microsoft.Contoso;

      interface Operations extends Azure.ResourceManager.Operations {}

      @Azure.ResourceManager.tenantResource
      model Widget is ProxyResource<WidgetProperties> {
        @key("widgetName")
        @segment("widgets")
        @path
        @visibility(Lifecycle.Read)
        name: string;
      }

      model WidgetProperties {
        color: string;
      }

      @armResourceOperations(Widget)
      interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
        @test
        @autoRoute
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

it("Generates provider paths correctly", async () => {
  const [results, _] = await runner.compileAndDiagnose(
    `
    @armProviderNamespace
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Contoso;
    enum Versions {
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

it("Generates tenant paths correctly", async () => {
  const [results, _] = await runner.compileAndDiagnose(
    `
    @armProviderNamespace
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Contoso;
    enum Versions {
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
