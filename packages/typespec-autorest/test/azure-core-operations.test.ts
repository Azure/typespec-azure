import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

const wrapperCode = `
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
namespace Contoso.WidgetManager;

alias ServiceTraits = SupportsRepeatableRequests &
SupportsConditionalRequests &
SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
`;

describe("typespec-autorest: Azure.Core.ResourceOperations", () => {
  it("ensure properties with 'create' visibility are included in the ResourceCreateOrUpdate body", async () => {
    const result = await openApiFor(`
        ${wrapperCode}
    
        @doc("A widget.")
        @resource("widgets")
        model Widget {
          @key("widgetName")
          @doc("The widget name.")
          @visibility(Lifecycle.Read)
          name: string;
        
          @doc("modality")
          @visibility(Lifecycle.Create, Lifecycle.Read)
          modality: string;
        
          @doc("The widget color.")
          color: string;
        }
        
        @doc("Create or update a widget.")
        @test
        op createOrUpdateWidget is Operations.ResourceCreateOrUpdate<Widget>;
      `);
    const propKeys = Object.keys(result.definitions["WidgetCreateOrUpdate"].properties);
    deepStrictEqual(propKeys, ["modality", "color"]);
  });

  it("ensure properties with 'create' visibility are included in the LongRunningResourceCreateOrUpdate body", async () => {
    const result = await openApiFor(`
      ${wrapperCode}

      @doc("A widget.")
      @resource("widgets")
      model Widget {
        @key("widgetName")
        @doc("The widget name.")
        @visibility(Lifecycle.Read)
        name: string;
      
        @doc("modality")
        @visibility(Lifecycle.Create, Lifecycle.Read)
        modality: string;
      
        @doc("The widget color.")
        color: string;
      }
      
      @doc("Create or update a widget.")
      @test
      op createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
    `);

    const propKeys = Object.keys(result.definitions["WidgetCreateOrUpdate"].properties);
    deepStrictEqual(propKeys, ["modality", "color"]);
  });

  it("ensure ConditionalRequestHeaders does not appear on Action or List operations", async () => {
    function checkParams(params: any, path: string) {
      params.forEach((param: { $ref?: string }) => {
        if (param.$ref) {
          const hasConditionalRequestHeaders = param.$ref.indexOf("ConditionalRequestHeaders") > -1;
          if (hasConditionalRequestHeaders) {
            throw new Error(`ConditionalRequestHeaders should not appear in ${path}`);
          }
        }
      });
    }

    const result = await openApiFor(`
      ${wrapperCode}

      @doc("A widget.")
      @resource("widgets")
      model Widget {
        @key("widgetName")
        @doc("The widget name.")
        name: string;
      }

      @doc(".")
      @test
      op listWidgets is Operations.ResourceList<
        Widget,
        ListQueryParametersTrait<StandardListQueryParameters & SelectQueryParameter>
      >;

      @doc(".")
      @test
      op actionWidget is Operations.ResourceAction<Widget, {}, {}>;
    `);

    let params = result.paths["/widgets/{widgetName}:actionWidget"].post.parameters;
    checkParams(params, "/widgets/{widgetName}:actionWidget");

    params = result.paths["/widgets"].get.parameters;
    checkParams(params, "/widgets");
  });
});
