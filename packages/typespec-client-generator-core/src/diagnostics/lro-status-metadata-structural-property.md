This diagnostic is issued when `@lroStatusMetadata` selects a property that already has a structural LRO role, such as status, result, error, polling location, or final location.

## Impact

- **Area:** LRO status metadata. The structural property is omitted from `SdkLroServiceMetadata.statusMetadata`.
- **Not affected:** The property's existing LRO protocol role and normal polling behavior are unchanged.

## ❌ Incorrect Usage

```typespec
model OperationStatus {
  @lroStatus
  @lroStatusMetadata
  status: OperationState;
}
```

## Diagnostic Message

TCGC reports:

```text
@lroStatusMetadata cannot select the status monitor's status property 'status'.
```

## ✅ How to Fix

Remove `@lroStatusMetadata` from structural LRO properties and apply it only to auxiliary values.

```typespec
model OperationStatus {
  @lroStatus
  status: OperationState;

  @lroStatusMetadata
  percentComplete?: int32;
}
```

## Suppression

This diagnostic should not be suppressed. Select only auxiliary status-monitor properties.
