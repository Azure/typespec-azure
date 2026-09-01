import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

@doc("Gets widget details.")
@route("/widgets/details")
@get
op getWidget(): {
  @statusCode statusCode: 200;
  @body details: string;
};

@@clientLocation(getWidget, "");
