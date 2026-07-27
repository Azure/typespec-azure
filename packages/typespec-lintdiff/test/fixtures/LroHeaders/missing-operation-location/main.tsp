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
  @doc("Status")
  status: string;
}

@doc("Accepted response without Operation-Location")
model AcceptedResponse {
  @doc("Status code")
  @statusCode statusCode: 202;
  @doc("Location header")
  @header("Location") location: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/no-openapi" "test"
@route("/jobs")
@doc("Create a job")
@extension("x-ms-long-running-operation", true)
@post op createJob(@query("api-version") @doc("API version") apiVersion: string, @body @doc("Job") body: Job): Job | AcceptedResponse;
