import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing namespace."
@armProviderNamespace
@service({
  title: "Microsoft.CSharpAttributeTest",
})
@OpenAPI.info({
  version: "2021-09-21-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.CSharpAttributeTest;

interface Operations extends Azure.ResourceManager.Operations {}

model CustomAttributesResource is TrackedResource<CustomAttributesProperties> {
  @doc("The name of the all properties resource.")
  @key("customAttributesName")
  @segment("customAttributes")
  @path
  name: string;
}

@armResourceOperations
interface CustomAttributes
  extends TrackedResourceOperations<CustomAttributesResource, CustomAttributesProperties> {}

@doc("CustomAttributesProperties models that included fields will have custom C# attribute.")
model CustomAttributesProperties {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;

  @doc("duration will have custom JsonConverter attributes")
  pollingInterval: duration;

  @doc("safeint will have custom [SafeInt] attributes that later validation can key on")
  safeNumber: safeint;
}

@Azure.Core.lroStatus
@doc("Envelope provisioning state.")
union EnvelopeProvisioningState {
  string,
  ResourceProvisioningState,

  @doc("Working state.")
  Working: "Working",
}
