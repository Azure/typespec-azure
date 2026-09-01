import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Test Service" })
namespace TestService;

@doc("Fetches widget details.")
@route("/widgets/{name}/details")
@get
@operationId("Widgets_GetDetails")
op fetchDetails(
  @doc("Widget name.")
  @path
  name: string,
): {
  @statusCode statusCode: 200;
  @body details: string;
};
