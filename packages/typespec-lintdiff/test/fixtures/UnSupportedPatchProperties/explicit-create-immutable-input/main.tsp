import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.TestService;

@parameterVisibility(Lifecycle.Create)
@patch
@route("/widgets")
op update(
  @body body: {
    @visibility(Lifecycle.Create) location?: string;
  },
): void;
