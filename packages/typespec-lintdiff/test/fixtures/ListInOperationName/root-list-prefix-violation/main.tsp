import "../../lib/imports.tsp";
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Result {
  value: string[];
}

@route("/widgets")
@get
op listWidgets(): Result;
