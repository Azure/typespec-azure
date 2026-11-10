using TypeSpec.Reflection;

namespace Azure.Core;

/**
 * Options for the approvedBreakingChange decorator.
 */
model ApprovedBreakingChangeOptions {
  /** Optional DiffKind filter (e.g., "ResponsePropertyRemoved"). */
  kind?: string;

  /** Optional version lower bound — suppression applies when head version >= since. */
  since?: string;

  /**
   * Identity path from the suppression site to the violation target.
   * Required when the suppression is not on the target node itself.
   * Uses dot-separated segments matching the finding's element path
   * (e.g., "body.properties.legacy", "query.filter", "properties.name").
   */
  path?: string;
}

/**
 * Marks a breaking change as intentionally approved for cross-version comparison.
 *
 * When placed on a type, property, operation, or namespace, it suppresses
 * the matching breaking-change finding in the tool output.
 *
 * @param reason A required explanation of why the breaking change is approved.
 * @param options Optional suppression options: kind, since, and path filters.
 */
extern dec approvedBreakingChange(
  target:
    | Model
    | ModelProperty
    | Operation
    | Enum
    | EnumMember
    | Union
    | UnionVariant
    | Scalar
    | Interface
    | Namespace,
  reason: valueof string,
  options?: valueof ApprovedBreakingChangeOptions
);

/**
 * Options for the approvedUnversionedChange decorator.
 */
model ApprovedUnversionedChangeOptions {
  /** Optional DiffKind filter (e.g., "ResponsePropertyRemoved"). */
  kind?: string;

  /**
   * Identity path from the suppression site to the violation target.
   * Required when the suppression is not on the target node itself.
   * Uses dot-separated segments matching the finding's element path
   * (e.g., "city", "properties.name").
   * For an OperationRemoved approval on the operation's surviving interface or namespace,
   * use the deleted operation's declaration name (e.g., "deleteWidget").
   * This scope applies only to that immediate parent, not to other interfaces or namespaces.
   */
  path?: string;
}

/**
 * Marks a same-version structural difference as intentionally approved.
 *
 * A same-version comparison uses two compilations of the same API version. Any difference
 * indicates a version projection inconsistency. Use this decorator only when the inconsistency
 * is known and accepted (e.g., during a refactoring migration).
 *
 * @param reason A required explanation of why the unversioned change is approved.
 * @param options Optional suppression options: kind filter.
 */
extern dec approvedUnversionedChange(
  target:
    | Model
    | ModelProperty
    | Operation
    | Enum
    | EnumMember
    | Union
    | UnionVariant
    | Scalar
    | Interface
    | Namespace,
  reason: valueof string,
  options?: valueof ApprovedUnversionedChangeOptions
);
