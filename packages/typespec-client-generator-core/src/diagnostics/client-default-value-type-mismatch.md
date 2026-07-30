This diagnostic is issued when the type of the value passed to `@clientDefaultValue` does not match the type of the property it is applied to. When `@alternateType` is present, the default value is validated against the alternate type instead.

## Impact

- **Area:** Client default values. Catches mismatches where a string default is applied to a numeric property (or vice versa), which could produce incorrect defaults in generated SDKs.
- **Not affected:** Properties without `@clientDefaultValue`, properties where the value type matches, or properties where `@alternateType` makes the value type valid.

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

Or use `@alternateType` to change the client-facing type so it matches the default value:

```typespec
@Azure.ClientGenerator.Core.Legacy.clientDefaultValue("10")
@Azure.ClientGenerator.Core.alternateType(string)
@query pageSize?: int32; // no warning — default matches alternate type
```

## Suppression

If the mismatch is intentional, you can suppress this diagnostic. Note that the mismatched default value will still be applied to generated SDKs when suppressed.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-default-value-type-mismatch" "intentional mismatch"
@Azure.ClientGenerator.Core.Legacy.clientDefaultValue("10")
@query pageSize?: int32;
```
