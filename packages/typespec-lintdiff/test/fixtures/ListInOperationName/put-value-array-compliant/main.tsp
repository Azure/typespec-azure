import "../../lib/imports.tsp";

using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Result {
  value: string[];
}

interface Widgets {
  @route("/widgets")
  @put
  getWidgets(): Result;
}
