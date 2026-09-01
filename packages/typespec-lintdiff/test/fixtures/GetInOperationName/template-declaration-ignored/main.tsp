import "../../lib/imports.tsp";

using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

@get
op ArmResourceRead<T>(): T;

@doc("Gets widget details.")
@route("/widgets/details")
op getWidget is ArmResourceRead<{
  @statusCode statusCode: 200;
  @body details: string;
}>;
