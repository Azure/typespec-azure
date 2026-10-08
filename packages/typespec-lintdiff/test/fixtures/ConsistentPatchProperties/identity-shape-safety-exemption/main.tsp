import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.TestService;

model Identity {
  required: string;
  extra?: boolean = false;
}

@patch
@route("/widgets")
op update(
  @body body: {
    identity: Identity;
  },
): {
  identity: {
    required: string;
  };
};
