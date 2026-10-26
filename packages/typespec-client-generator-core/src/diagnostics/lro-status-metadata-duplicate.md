This diagnostic is issued when `@lroStatusMetadata` is applied more than once to the same model property.

## Impact

- **Area:** LRO status metadata. The first declaration is retained.
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
@lroStatusMetadata is applied more than once to property 'percentComplete'.
```

## ✅ How to Fix

Use one declaration. A single scope string can include or exclude multiple emitters.

```typespec
model OperationStatus {
  status: OperationState;

  @lroStatusMetadata("python, java")
  percentComplete?: int32;
}
```

## Suppression

This diagnostic should not be suppressed. Remove the duplicate declaration.
