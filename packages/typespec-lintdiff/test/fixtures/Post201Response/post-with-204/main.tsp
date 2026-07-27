// Test: post-with-204
// Compliant: POST operation returns 204 instead of 201.

import "@typespec/http";
import "@typespec/rest";
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

@doc("A job resource")
model Job {
  @doc("Job ID")
  id: string;

  @doc("Job status")
  status: string;
}

@doc("No-content response")
model NoContentResponse {
  @doc("HTTP 204 status code")
  @statusCode statusCode: 204;
}

@route("/jobs")
@doc("Job operations")
interface Jobs {
  @doc("Create a job")
  @post createJob(
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Job body") body: Job,
  ): NoContentResponse;
}
