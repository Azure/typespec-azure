import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Result {
  @pageItems
  value: string[];

  @nextLink
  nextLink: url;
}

interface Widgets {
  @list
  @route("/widgets")
  @get
  listWidgets(): Result;
}

@@clientName(Widgets.listWidgets, "Get");
