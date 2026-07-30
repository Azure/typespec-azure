This diagnostic is issued when the type of the value passed to `@clientDefaultValue` does not match the type of the property it is applied to.

## Impact

- **Area:** Client default values. Catches mismatches where a string default is applied to a numeric property (or vice versa), which would produce an incorrect default in generated SDKs.
- **Not affected:** Properties without `@clientDefaultValue`, or properties where the value type already matches.

## ❌ Incorrect Usage

```typespec
model RequestOptions {
  @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("10")
  pageSize?: int32; // string default on numeric property

  @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(123)
  sortOrder?: string; // numeric default on string property
}
```

## Diagnostic Message

TCGC reports:

```text
Client default value type "string" does not match property type "int32". The default value type should match the property type.
```

## ✅ How to Fix

Use a default value whose type matches the property type:

```typespec
model RequestOptions {
  @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
  pageSize?: int32;

  @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("asc")
  sortOrder?: string;
}
```

## Suppression

If the mismatch is intentional (e.g., when combined with `@alternateType` that changes the client-facing type), suppress the diagnostic with a justification:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-default-value-type-mismatch" "default matches alternateType"
@Azure.ClientGenerator.Core.Legacy.clientDefaultValue("10")
@Azure.ClientGenerator.Core.alternateType(string)
@query pageSize?: int32;
```
