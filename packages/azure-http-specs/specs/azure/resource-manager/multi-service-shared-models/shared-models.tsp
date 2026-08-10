namespace Azure.ResourceManager.MultiServiceSharedModels.Shared;

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
