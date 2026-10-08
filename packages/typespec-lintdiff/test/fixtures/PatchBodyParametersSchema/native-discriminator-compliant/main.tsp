import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.TestService;

@discriminator("kind")
model AbsentDiscriminator {}

@discriminator("kind")
model OptionalDiscriminator {
  kind?: string;
}

@discriminator("kind")
model ExcludedDiscriminator {
  @visibility(Lifecycle.Read)
  kind: string;

  name?: string;
}

model PatchBody {
  absent?: AbsentDiscriminator;
  optional?: OptionalDiscriminator;
  excluded?: ExcludedDiscriminator;
}

@route("/widgets")
@patch
op update(@body body: PatchBody): void;
