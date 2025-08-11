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

/**
 * Model used only to spread in the standard `etag` envelope property for a resource
 *
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...ETagProperty;
 * }
 * ```
 */
alias EntityTagProperty = {
  @doc("If etag is provided in the response body, it may also be provided as a header per the normal etag convention.  Entity tags are used for comparing two or more entities from the same requested resource. HTTP/1.1 uses entity tags in the etag (section 14.19), If-Match (section 14.24), If-None-Match (section 14.26), and If-Range (section 14.27) header fields.")
  @visibility(Lifecycle.Read)
  etag?: string;
};
