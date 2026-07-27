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

@doc("A widget resource")
model Widget {
  @doc("Widget ID")
  id: string;

  @doc("Widget name")
  name: string;
}

@route("/widgets")
interface Widgets {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  #suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
  @get list(@query("api-version") @doc("API version") apiVersion: string): Widget[];

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  @get getWidget(@path @doc("Widget ID") id: string, @query("api-version") @doc("API version") apiVersion: string): Widget;
}
