import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;
using Azure.ResourceManager;
using TypeSpec.Http;
using TypeSpec.Versioning;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

model OperationList {
  @pageItems
  value: string[];

  @nextLink
  nextLink?: string;
}

interface Operations extends Azure.ResourceManager.Legacy.Operations<ArmResponse<OperationList>> {}

@@clientName(Operations.list, "Get");
