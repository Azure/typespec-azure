This diagnostic is issued when two selected LRO status metadata properties have the same projected SDK client name.

## Impact

- **Area:** LRO status metadata. The conflicting property is omitted from `SdkLroServiceMetadata.statusMetadata`.
- **Not affected:** Wire names and normal LRO polling behavior are unchanged.

## ❌ Incorrect Usage

```typespec
model OperationStatus {
  status: OperationState;

  @clientName("progress")
  @lroStatusMetadata
  percentComplete?: int32;

  @lroStatusMetadata
  progress?: string;
}
```

## Diagnostic Message

TCGC reports:

```text
LRO status metadata has more than one entry with the projected client name 'progress'.
```

## ✅ How to Fix

Give each selected property a unique client name or remove one of the selections.

```typespec
model OperationStatus {
  status: OperationState;

  @lroStatusMetadata
  percentComplete?: int32;

  @lroStatusMetadata
  progressDescription?: string;
}
```

## Suppression

This diagnostic should not be suppressed. Resolve the projected client-name conflict.
