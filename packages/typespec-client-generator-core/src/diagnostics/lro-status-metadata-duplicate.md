This diagnostic is issued when multiple `@lroStatusMetadata` declarations on the same model property have overlapping emitter scopes. Overlap is checked once at declaration time, not separately for each emitter context.

## Impact

- **Area:** LRO status metadata. Previously accepted declarations are retained; the overlapping declaration is rejected.
- **Not affected:** Other status-monitor properties and normal LRO polling behavior are unchanged.

## ❌ Incorrect Usage

```typespec
model OperationStatus {
  status: OperationState;

  @lroStatusMetadata("python")
  @lroStatusMetadata
  percentComplete?: int32;
}
```

## Diagnostic Message

TCGC reports:

```text
@lroStatusMetadata is applied more than once to property 'percentComplete' with overlapping scopes.
```

## ✅ How to Fix

Combine the scopes into one declaration, or use separate declarations with disjoint scopes. An unscoped declaration overlaps every scope. For example, `"!python"` overlaps `"java"` but does not overlap `"python"`.

```typespec
model OperationStatus {
  status: OperationState;

  @lroStatusMetadata("python, java")
  percentComplete?: int32;
}
```

Separate augments may select different emitters:

```typespec
@@lroStatusMetadata(OperationStatus.percentComplete, "python");
@@lroStatusMetadata(OperationStatus.percentComplete, "javascript");
```

Use these augments instead of the inline decorator above, not in addition to it.

## Suppression

This diagnostic should not be suppressed. Remove the duplicate declaration.
