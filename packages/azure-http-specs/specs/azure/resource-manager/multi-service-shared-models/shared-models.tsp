import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

/**
 * Common metadata shared across multiple services.
 */
model SharedMetadata {
  /**
   * Creation timestamp of the resource.
   */
  createdAt?: utcDateTime;

  /**
   * Creator of the resource.
   */
  createdBy?: string;

  /**
   * Tags associated with the resource.
   */
  tags?: Record<string>;
}
