import { t } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { strictEqual } from "assert";
import { it } from "vitest";
import { Tester } from "./tester.js";

it("Generates armResourceAction paths correctly", async () => {
  const { thisIsTheCorrectPattern, DefaultToCamelCase, program } = await Tester.compile(t.code`
    @armProviderNamespace
    namespace Microsoft.Contoso;

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
      @action("correctPattern")
      @post
      @armResourceAction(Widget)
      ${t.op("thisIsTheCorrectPattern")}(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;

      @post
      @armResourceAction(Widget)
      ${t.op("DefaultToCamelCase")}(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
    }
  `);

  strictEqual(
    getHttpOperation(program, thisIsTheCorrectPattern)[0].path,
    "/providers/Microsoft.Contoso/widgets/{widgetName}/correctPattern",
  );

  strictEqual(
    getHttpOperation(program, DefaultToCamelCase)[0].path,
    "/providers/Microsoft.Contoso/widgets/{widgetName}/defaultToCamelCase",
  );
});

it("Generates provider paths correctly", async () => {
  const { getVmsSizes, getVmsSizesAtLocation, getThrottledRequests, program } =
    await Tester.compile(t.code`
    @armProviderNamespace
    @service
    namespace Microsoft.Contoso;

    model VmSize {
      cpus: int32;
    }

    @armResourceOperations
    interface ProviderOperations {
      @get
      @armResourceRead(VmSize)
      @autoRoute
      ${t.op("getVmsSizes")} is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      
      @armResourceRead(VmSize)
      ${t.op("getVmsSizesAtLocation")} is ArmProviderActionSync<void, VmSize, SubscriptionActionScope, Parameters= LocationParameter>;
      
      @armResourceRead(VmSize)
      @action("logAnalytics/apiAccess/getThrottledRequests")
      ${t.op("getThrottledRequests")} is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
    }
  `);

  strictEqual(
    getHttpOperation(program, getVmsSizes)[0].path,
    "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/getVmsSizes",
  );

  strictEqual(
    getHttpOperation(program, getVmsSizesAtLocation)[0].path,
    "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/locations/{location}/getVmsSizesAtLocation",
  );

  strictEqual(
    getHttpOperation(program, getThrottledRequests)[0].path,
    "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/logAnalytics/apiAccess/getThrottledRequests",
  );
});

it("Generates tenant paths correctly", async () => {
  const { getCores, program } = await Tester.compile(t.code`
    @armProviderNamespace
    @service
    namespace Microsoft.Contoso;

    model CoresSize {
      available: int32;
    }

    @armResourceOperations
    interface ProviderOperations {
      @armResourceRead(CoresSize)
      ${t.op("getCores")} is ArmProviderActionSync<void, CoresSize, TenantActionScope>;
    }
  `);

  strictEqual(getHttpOperation(program, getCores)[0].path, "/providers/Microsoft.Contoso/getCores");
});

it("Generates GetResourceOperationStatus paths correctly", async () => {
  const { tenantOp, subscriptionOp, tenantLocationOp, subscriptionLocationOp, program } =
    await Tester.compile(t.code`
    @armProviderNamespace
    @service
    namespace Microsoft.Contoso;

    @armResourceOperations
    interface TenantOps {
      ${t.op("tenantOp")} is GetResourceOperationStatus;
    }

    @armResourceOperations
    interface SubscriptionOps {
      ${t.op("subscriptionOp")} is GetResourceOperationStatus<ArmOperationStatus, SubscriptionActionScope>;
    }

    @armResourceOperations
    interface TenantLocationOps {
      ${t.op("tenantLocationOp")} is GetResourceOperationStatus<ArmOperationStatus, TenantLocationActionScope>;
    }

    @armResourceOperations
    interface SubscriptionLocationOps {
      ${t.op("subscriptionLocationOp")} is GetResourceOperationStatus<ArmOperationStatus, SubscriptionLocationActionScope>;
    }
  `);

  strictEqual(
    getHttpOperation(program, tenantOp)[0].path,
    "/providers/Microsoft.Contoso/operationStatuses/{operationId}",
  );
  strictEqual(
    getHttpOperation(program, subscriptionOp)[0].path,
    "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/operationStatuses/{operationId}",
  );
  strictEqual(
    getHttpOperation(program, tenantLocationOp)[0].path,
    "/providers/Microsoft.Contoso/locations/{location}/operationStatuses/{operationId}",
  );
  strictEqual(
    getHttpOperation(program, subscriptionLocationOp)[0].path,
    "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/locations/{location}/operationStatuses/{operationId}",
  );
});
