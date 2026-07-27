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

@doc("A widget")
model Widget {
  @doc("Name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
@sharedRoute
@route("/widgets")
@doc("List widgets")
@get op listWidgets(@query("api-version") @doc("API version") apiVersion: string): Widget[];

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
@sharedRoute
@route("/widgets")
@doc("List widgets with filter")
@get op listWidgetsFiltered(@query @doc("Filter") filter: string, @query("api-version") @doc("API version") apiVersion: string): Widget[];
