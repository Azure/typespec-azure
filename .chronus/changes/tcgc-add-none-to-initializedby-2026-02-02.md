---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added `InitializedBy.none` (value 0) to the `InitializedBy` enum to allow TypeSpec authors to indicate that client constructors should be omitted and hand-written. This addresses scenarios where generated constructors need to be replaced with custom implementations.

**Note**: The internal `InitializedByFlags.Default` value changed from `0` to `-1` to accommodate this addition. This should not affect consumers who use the named constant rather than numeric comparisons. If your code directly compares `initializedBy` values to `0`, please update to use `InitializedByFlags.Default` or handle both `Default` (-1) and `None` (0) cases explicitly.
