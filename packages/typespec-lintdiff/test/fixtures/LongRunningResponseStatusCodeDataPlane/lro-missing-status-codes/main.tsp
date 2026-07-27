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

@doc("A job")
model Job {
  @doc("Job ID")
  id: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/no-openapi" "test"
#suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "test"
@route("/jobs/{id}")
@doc("Delete a job")
@extension("x-ms-long-running-operation", true)
@delete op deleteJob(@path @doc("Job ID") id: string, @query("api-version") @doc("API version") apiVersion: string): {
  @doc("Status code")
  @statusCode statusCode: 202;
  @doc("Operation location")
  @header("Operation-Location") operationLocation: string;
};
