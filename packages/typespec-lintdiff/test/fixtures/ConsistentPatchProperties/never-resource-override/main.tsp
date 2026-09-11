import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Inherited resource override" })
namespace Microsoft.TestService;

/** Shared resource properties. */
model Base {
  /** Property removed by the resource model. */
  extra?: string;

  /** Resource name. */
  name?: string;
}

/** Resource excludes the inherited extra property. */
model Resource extends Base {
  extra?: never;
}

/** Update tries to write the excluded property. */
model Update {
  /** Excluded resource property. */
  extra?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Update the resource. */
@route("/widgets")
@patch
op update(
  /** Update body. */
  @body body: Update,
): Resource;
