import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: Long-running Operations", () => {
  it("includes x-ms-long-running-operation", async () => {
    const openapi = await openApiFor(
      `
      using Azure.Core.Traits;

      @useAuth(
        ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
          {
            type: OAuth2FlowType.implicit,
            authorizationUrl: "https://login.contoso.com/common/oauth2/v2.0/authorize",
            scopes: ["https://widget.contoso.com/.default"],
          }
        ]>
      )
      @service({
        title: "Contoso Widget Manager",
      })
      @server(
        "{endpoint}/widget",
        "Contoso Widget APIs",
        {
          @doc("""
      Supported Widget Services endpoints (protocol and hostname, for example:
      https://westus.api.widget.contoso.com).
      """)
          endpoint: string,
        }
      )
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Test;

      alias ServiceTraits = SupportsRepeatableRequests & SupportsConditionalRequests & SupportsClientRequestId;

      alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

      @resource("widgets")
      @doc(".")
      model Widget {
        @key("widgetName")
        @doc(".")
        @visibility("read")
        name: string;
        @doc(".")
        manufacturerId: string;
      
      ...EtagProperty;
      }

      op getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
    
      @pollingOperation(getWidgetOperationStatus)
      op createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
      `
    );

    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}"].patch["x-ms-long-running-operation"],
      true
    );
    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}"].patch["x-ms-long-running-operation-options"],
      {
        "final-state-via": "operation-location",
        "final-state-schema": {
          $ref: "#/definitions/Widget",
        },
      }
    );
    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}/operations/{operationId}"].get[
        "x-ms-long-running-operation"
      ],
      undefined
    );
  });
});
