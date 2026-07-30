using TypeSpec.Reflection;

namespace Azure.BreakingChange;

/**
 * Marks a breaking change as intentionally approved for cross-version (Phase B) comparison.
 *
 * When placed on a type, property, operation, or namespace, it suppresses
 * the matching breaking-change finding in the tool output.
 *
 * @param reason A required explanation of why the breaking change is approved.
 * @param kind Optional DiffKind filter. If specified, only suppresses this specific kind
 *   of breaking change (e.g., "ResponsePropertyRemoved", "RequestPropertyMadeRequired").
 *   If omitted, suppresses all breaking-change kinds on this target.
 * @param since Optional version lower bound. If specified, the suppression only applies
 *   when the head api-version is >= this value (e.g., "2026-01-01").
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
  kind?: valueof string,
  since?: valueof string
);

/**
 * Marks a same-version (Phase A) structural difference as intentionally approved.
 *
 * Phase A compares two compilations of the same version. Any diff indicates a
 * version projection inconsistency. Use this decorator only when the inconsistency
 * is known and accepted (e.g., during a refactoring migration).
 *
 * @param reason A required explanation of why the unversioned change is approved.
 * @param kind Optional DiffKind filter. If specified, only suppresses this specific kind.
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
  kind?: valueof string
);
