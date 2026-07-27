// Test: post-with-201
// Violation: POST operation returns a 201 Created response.

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

@doc("Job created response")
model JobCreatedResponse {
  @doc("HTTP 201 status code")
  @statusCode statusCode: 201;
  @doc("The created job")
  @body body: Job;
}

@route("/jobs")
@doc("Job operations")
interface Jobs {
  @doc("Create a job")
  @post createJob(
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Job body") body: Job,
  ): JobCreatedResponse;
}
