import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",

  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2025_01_01: "2025-01-01",
}

model IdentityResult {
  @added(Versions.v2025_01_01)
  identity?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;
}

@route("/identity")
@get
op getIdentity(): IdentityResult;
