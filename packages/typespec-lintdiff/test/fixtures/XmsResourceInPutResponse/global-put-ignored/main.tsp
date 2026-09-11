import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService {
  enum Versions {
    @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
    v2024_01_01: "2024-01-01",
  }

  interface Operations extends Azure.ResourceManager.Operations {}
}

/** A global result that resembles a resource. */
model GlobalResult {
  /** The resource name. */
  name?: string;

  /** The resource type. */
  type?: string;
}

/** A global PUT outside the ARM provider namespace. */
@route("/global/{name}")
@put
op globalPut(@path name: string): GlobalResult;
