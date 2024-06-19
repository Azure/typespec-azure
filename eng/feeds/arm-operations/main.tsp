import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "./operation.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;

/** {{parameters.ServiceNamespace}} Resource Provider management API. */
@armProviderNamespace
@service({
  title: "{{parameters.ServiceNamespace}} management service",
})
@versioned({{parameters.ServiceNamespace}}.Versions)
namespace {{parameters.ServiceNamespace}};

/** The available API versions. */
enum Versions {
  /** {{parameters.APIVersion}} version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "{{parameters.APIVersion}}",
}
