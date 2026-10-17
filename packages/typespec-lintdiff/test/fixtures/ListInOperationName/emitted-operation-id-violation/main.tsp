import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Test Service" })
namespace TestService;

model Result {
  value: string[];
}

interface Widgets {
  @operationId("Widgets_GetConfigs")
  @route("/configs")
  @get
  listConfigs(): Result;
}
