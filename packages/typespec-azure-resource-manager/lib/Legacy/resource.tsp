import "@typespec/rest";
import "@typespec/http";

namespace Azure.ResourceManager.Legacy;

using Azure.ResourceManager.Private;

/**
 * This type uses an optional location property, only used by legacy APIs.
 * Concrete tracked resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 * @template PropertiesOptional A boolean flag indicating whether the resource `Properties` field is marked as optional or required. Default true is optional and recommended.
 *
 * @example
 * ```typespec
 * model Employee is TrackedResourceWithOptionalLocation<EmployeeProperties> {
 *  ...ResourceNameParameter<Employee>
 * }
 * ```
 */
@doc("Concrete tracked resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@Http.Private.includeInapplicableMetadataInPayload(false)
model TrackedResourceWithOptionalLocation<
  Properties extends {},
  PropertiesOptional extends valueof boolean = true
> extends LegacyTrackedResource {
  @doc("The resource-specific properties for this resource.")
  @conditionalClientFlatten
  @armResourcePropertiesOptionality(PropertiesOptional)
  properties?: Properties;
}

/**
 * A tracked resource with the 'location' property optional
 */
@friendlyName("TrackedResource")
model LegacyTrackedResource extends CommonTypes.Resource {
  /** Resource tags. */
  tags?: Record<string>;

  /** The geo-location where the resource lives */
  @visibility(Lifecycle.Read, Lifecycle.Create)
  location?: string;
}
