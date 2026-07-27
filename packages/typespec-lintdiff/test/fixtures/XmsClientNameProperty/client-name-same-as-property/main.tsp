import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

/** A widget. */
model Widget {
  /** Widget name. */
  @extension("x-ms-client-name", "name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}")
/** Get a widget. */
@get op getWidget(
  @path /** Widget name. */ name: string,
  @query("api-version") /** API version. */ apiVersion: string,
): Widget;
