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

#suppress "@azure-tools/typespec-azure-core/no-enum" "test"
@doc("Status with case-insensitive duplicates")
enum Status {
  @doc("Active") Active: "Active",
  @doc("Active lowercase") active: "active",
}

@doc("A widget")
model Widget {
  @doc("Name")
  name: string;
  @doc("Status")
  status: Status;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}")
@doc("Get a widget")
@get op getWidget(@path @doc("Name") name: string, @query("api-version") @doc("API version") apiVersion: string): Widget;
