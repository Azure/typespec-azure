import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Test Service" })
namespace TestService;

interface Widgets {
  @extension("x-ms-pageable", #{ nextLinkName: "nextLink" })
  @route("/widgets")
  @post
  getWidgets(): string[];
}
