import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

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
@service(#{
  title: "Contoso Widget Manager",
})
@server(
  "{endpoint}/widget",
  "Contoso Widget APIs",
  {
    endpoint: string,
  }
)
namespace Contoso.WidgetManager;

alias ServiceTraits = SupportsRepeatableRequests &
SupportsConditionalRequests &
SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
`;

it("ensure properties with 'create' visibility are included in the ResourceCreateOrUpdate body", async () => {
  const result = await compileOpenAPI(
    `
      ${wrapperCode}
  
      
      @resource("widgets")
      model Widget {
        @key("widgetName")
        
        @visibility(Lifecycle.Read)
        name: string;
      
        
        @visibility(Lifecycle.Create, Lifecycle.Read)
        modality: string;
      
        
        color: string;
      }
      
      
      @test
      op createOrUpdateWidget is Operations.ResourceCreateOrUpdate<Widget>;
    `,
    { preset: "azure" },
  );
  const body = result.paths["/widgets/{widgetName}"].patch!.parameters.find(
    (param) => "in" in param && param.in === "body",
  );
  ok(body);
  deepStrictEqual(body.schema, { $ref: "#/definitions/Widget" });
  const widget = result.definitions?.["Widget"];
  ok(widget);
  deepStrictEqual(Object.keys(widget.properties!), ["name", "modality", "color"]);
  deepStrictEqual(widget.required, ["name", "modality", "color"]);
  strictEqual(widget.properties!.name.readOnly, true);
  deepStrictEqual(widget.properties!.modality["x-ms-mutability"], ["read", "create"]);
});

it("ensure properties with 'create' visibility are included in the LongRunningResourceCreateOrUpdate body", async () => {
  const result = await compileOpenAPI(
    `
    ${wrapperCode}

    
    @resource("widgets")
    model Widget {
      @key("widgetName")
      
      @visibility(Lifecycle.Read)
      name: string;
    
      
      @visibility(Lifecycle.Create, Lifecycle.Read)
      modality: string;
    
      
      color: string;
    }
    
    
    @test
    op createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
  `,
    { preset: "azure" },
  );

  const body = result.paths["/widgets/{widgetName}"].patch!.parameters.find(
    (param) => "in" in param && param.in === "body",
  );
  ok(body);
  deepStrictEqual(body.schema, { $ref: "#/definitions/Widget" });
  const widget = result.definitions?.["Widget"];
  ok(widget);
  deepStrictEqual(Object.keys(widget.properties!), ["name", "modality", "color"]);
  deepStrictEqual(widget.required, ["name", "modality", "color"]);
  strictEqual(widget.properties!.name.readOnly, true);
  deepStrictEqual(widget.properties!.modality["x-ms-mutability"], ["read", "create"]);
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

  const result = await compileOpenAPI(
    `
    ${wrapperCode}

    
    @resource("widgets")
    model Widget {
      @key("widgetName")
      
      name: string;
    }

    
    @test
    op listWidgets is Operations.ResourceList<
      Widget,
      ListQueryParametersTrait<StandardListQueryParameters & SelectQueryParameter>
    >;

    
    @test
    op actionWidget is Operations.ResourceAction<Widget, {}, {}>;
  `,
    { preset: "azure" },
  );

  let params = result.paths["/widgets/{widgetName}:actionWidget"].post!.parameters;
  checkParams(params, "/widgets/{widgetName}:actionWidget");

  params = result.paths["/widgets"].get!.parameters;
  checkParams(params, "/widgets");
});
