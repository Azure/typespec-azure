import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "./proxy.tsp";
import "./extension.tsp";

using Versioning;
using Azure.ResourceManager;

/** Contoso Resource Provider management API. */
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint" ""
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-common-types-version" "Preserve older common-types schemas for this grandfathered API sample."
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  @Azure.Core.previewVersion
  `2025-10-01-preview`,
}

/** Standard operation list */
interface Operations extends Azure.ResourceManager.Operations {}
