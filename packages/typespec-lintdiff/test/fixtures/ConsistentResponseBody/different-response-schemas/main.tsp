import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("Widget read response")
model WidgetRead {
  @doc("Name")
  name: string;
  @doc("Color")
  color: string;
  @doc("Read-only timestamp")
  createdAt: string;
}

@doc("Widget write response")
model WidgetWrite {
  @doc("Name")
  name: string;
  @doc("Color")
  color: string;
}

@route("/widgets/{name}")
interface Widgets {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  @doc("Get a widget")
  @get get(@path @doc("Widget name") name: string, @query("api-version") @doc("API version") apiVersion: string): WidgetRead;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  #suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
  @doc("Create or update a widget")
  @put createOrUpdate(@path @doc("Widget name") name: string, @query("api-version") @doc("API version") apiVersion: string, @body @doc("The widget") body: WidgetWrite): WidgetWrite;
}
