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

@doc("File upload form")
#suppress "@azure-tools/typespec-autorest/unsupported-multipart-type" "test"
model FileForm {
  @doc("File content")
  file: bytes;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/byos" "test"
@route("/upload")
@doc("Upload a file")
@post op upload(
  @doc("Content type") @header contentType: "multipart/form-data",
  @query("api-version") @doc("API version") apiVersion: string,
  @multipartBody @doc("File to upload") body: [HttpPart<FileForm, #{ name: "file" }>],
): void;
