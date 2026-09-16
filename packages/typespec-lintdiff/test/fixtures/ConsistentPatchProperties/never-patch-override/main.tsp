import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Inherited PATCH override" })
namespace Microsoft.TestService;

/** Shared update properties. */
model Base {
  /** Property removed by the update model. */
  extra?: string;

  /** Resource name. */
  name?: string;
}

/** Update excludes the inherited extra property. */
model Update extends Base {
  extra?: never;
}

/** Resource properties. */
model Resource {
  /** Resource name. */
  name?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Update the resource. */
@route("/widgets")
@patch
op update(
  /** Update body. */
  @body body: Update,
): Resource;
