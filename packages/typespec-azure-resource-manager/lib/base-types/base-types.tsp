import "../arm.tsp";

using Azure.ResourceManager;

namespace Azure.ResourceManager.BaseTypes;

/**
 * An ARM-managed base type descriptor identifying the schema contract a resource conforms to.
 * Used as a parameter to the `@azureBaseType` decorator to indicate which
 * base types a resource conforms to.
 */
model BaseTypeInfo {
  /** The base type identifier (for example, "agent"). */
  baseType: string;

  /** The schema version of the base type. */
  version: string;
}
