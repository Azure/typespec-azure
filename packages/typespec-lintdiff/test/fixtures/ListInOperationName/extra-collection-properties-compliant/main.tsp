import "../../lib/imports.tsp";
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Result {
  value: string[];
  nextLink?: url;
  count: int32;
}

interface Widgets {
  @route("/widgets")
  @get
  getWidgets(): Result;
}
