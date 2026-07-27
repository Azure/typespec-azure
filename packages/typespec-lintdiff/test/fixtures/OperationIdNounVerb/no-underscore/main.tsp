import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget resource")
model WidgetItem {
  @doc("The widget name")
  name: string;
}

@route("/widgets/{name}")
@doc("Get a widget")
@get
op getWidget(
  @path @doc("Widget name") @maxLength(128) @pattern("^[A-Za-z0-9_-]+$") name: string,
  @query("api-version") @doc("API version") apiVersion: string,
): WidgetItem;
