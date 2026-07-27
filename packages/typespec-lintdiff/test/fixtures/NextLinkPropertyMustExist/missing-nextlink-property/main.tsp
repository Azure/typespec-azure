import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget")
model Widget {
  @doc("The widget name")
  name: string;
}

@doc("Widget list")
model WidgetList {
  @doc("List of widgets")
  value: Widget[];
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/no-openapi" "test"
#suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
@route("/widgets")
@doc("List widgets")
@get
@extension("x-ms-pageable", #{ nextLinkName: "nextLink" })
op listWidgets(@query("api-version") @doc("API version") apiVersion: string): WidgetList;
