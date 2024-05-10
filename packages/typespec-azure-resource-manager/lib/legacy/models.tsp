using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager.Legacy;

//#region Standard Resource Operation Interfaces
/**
 * Concrete tracked resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 */
@doc("Concrete tracked resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@includeInapplicableMetadataInPayload(false)
model TrackedResourceWithRequiredProperties<Properties extends {}>
  extends Foundations.TrackedResource {
  @doc("The resource-specific required properties for this resource.")
  @extension("x-ms-client-flatten", true)
  properties: Properties;
}

/**
 * Concrete proxy resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 */
@doc("Concrete proxy resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@includeInapplicableMetadataInPayload(false)
model ProxyResourceWithRequiredProperties<Properties extends {}> extends Foundations.ProxyResource {
  @doc("The resource-specific required properties for this resource.")
  @extension("x-ms-client-flatten", true)
  properties: Properties;
}

/**
 * Concrete extension resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 */
@extensionResource
@doc("Concrete extension resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@includeInapplicableMetadataInPayload(false)
model ExtensionResourceWithRequiredProperties<Properties extends {}>
  extends Foundations.ExtensionResource {
  @doc("The resource-specific required properties for this resource.")
  @extension("x-ms-client-flatten", true)
  properties: Properties;
}
//#region

//#region Standard extraction models
