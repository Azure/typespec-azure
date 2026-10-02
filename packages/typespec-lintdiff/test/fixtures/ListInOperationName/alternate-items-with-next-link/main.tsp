import "../../lib/imports.tsp";
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Result {
  @pageItems
  items: string[];

  @nextLink
  nextLink: url;
}

interface Widgets {
  @list
  @route("/widgets")
  @get
  getWidgets(): Result;
}
