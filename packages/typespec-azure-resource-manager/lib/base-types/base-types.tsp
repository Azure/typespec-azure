using Reflection;

namespace Azure.ResourceManager.BaseTypes;

/**
 * An ARM-managed base type descriptor identifying the schema contract a resource conforms to.
 * Used as a parameter to the `@azureBaseType` decorator to indicate which
 * base types a resource conforms to.
 */
model BaseTypeInfo {
  /** The base type identifier (for example, "Agent"). */
  baseType: string;

  /** The schema version of the base type. */
  version: string;
}

/**
 * `@azureBaseType` marks an Azure Resource Manager resource properties model as implementing
 * a base type. Base types define structured constraints including required and
 * optional properties that conforming resources must implement.
 *
 * This decorator may be applied multiple times to indicate conformance to
 * multiple base types. Duplicate entries are ignored.
 *
 * @param baseType The base type specification this resource implements.
 *
 * @example
 *
 * ```typespec
 * @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
 * model MyAgentProperties {
 *   ...AgentProperties;
 *   ...AgentToolProperty;
 *   ...DefaultProvisioningStateProperty;
 * }
 * ```
 */
extern dec azureBaseType(target: Model, baseType: valueof BaseTypeInfo);
