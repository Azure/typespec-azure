import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Inherited encoded PATCH discriminator" })
namespace Microsoft.TestService;

/** Authored payload inherited by the discriminated model. */
model Base {
  /** Object represented as kind in the JSON payload. */
  @encodedName("application/json", "kind")
  payload?: {
    /** Property missing from the scalar resource kind. */
    extra?: string;
  };
}

/** Discriminator metadata must not replace the inherited authored object. */
@discriminator("kind")
model Details extends Base {}

interface Operations extends Azure.ResourceManager.Operations {}

/** Update the resource. */
@route("/widgets")
@patch
op update(
  /** Update body. */
  @body body: {
    /** Update details. */
    details?: Details;
  },
): {
  /** Resource details. */
  details?: {
    /** Scalar kind. */
    kind?: string;
  };
};
