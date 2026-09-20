import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.TestService;

model PatchBody {
  @visibility(Lifecycle.Read)
  id: string = "server";

  @visibility(Lifecycle.Create)
  createdBy?: string;

  @visibility(Lifecycle.Update)
  name: string;
}

@route("/widgets")
@parameterVisibility(Lifecycle.Create)
@patch
op update(@body body: PatchBody): void;
