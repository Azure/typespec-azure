import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Inherited encoded response discriminator" })
namespace Microsoft.TestService;

/** Authored payload inherited by the discriminated model. */
model Base {
  /** Object represented as kind in the JSON payload. */
  @encodedName("application/json", "kind")
  payload?: {
    /** Writable resource property. */
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
    details?: {
      /** Object-valued kind. */
      kind?: {
        /** Updated property. */
        extra?: string;
      };
    };
  },
): {
  /** Resource details. */
  details?: Details;
};
