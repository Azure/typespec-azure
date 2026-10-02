import "@typespec/http";
import "@typespec/openapi";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A certificate resource")
model Certificate {
  @doc("The certificate name")
  name: string;
}

@operationId("Certificates_GetCertificate")
@route("/certificates/{name}")
@doc("Get a certificate")
@get
op getCertificate(
  @path @doc("Certificate name") name: string,
  @query("api-version") @doc("API version") apiVersion: string,
): Certificate;
