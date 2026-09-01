import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Test Service" })
namespace TestService;

@doc("Lists widget migrations.")
@route("/widgets/migrations")
@get
@operationId("Widgets_listMigrations")
op listMigrations(): {
  @statusCode statusCode: 200;
  @body migrations: string[];
};
