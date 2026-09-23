import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.TestService;

model PatchBody {
  @visibility(Lifecycle.Read)
  id: string;

  @visibility(Lifecycle.Create)
  createdBy?: string;

  name?: string;
}

model AugmentedPatchBody {
  ...PatchBody;

  @visibility(Lifecycle.Read, Lifecycle.Query)
  unrelated?: string;
}

model DefaultPatchBody {
  @visibility(Lifecycle.Read)
  id: string = "server";

  name?: string;
}

@route("/widgets")
@patch
op update(@body body: PatchBody): void;

@route("/augmented")
@patch
op updateAugmented(@body body: AugmentedPatchBody): void;

@route("/defaults")
@patch
op updateDefaults(@body body: DefaultPatchBody): void;
