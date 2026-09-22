import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.TestService;

model Element {
  id: string;
  enabled?: boolean = false;
  extra?: string;
}

@patch
@route("/widgets")
op update(
  @body body: {
    items?: Element[];
  },
): {
  items: {
    id: string;
    enabled: boolean;
  }[];
};
