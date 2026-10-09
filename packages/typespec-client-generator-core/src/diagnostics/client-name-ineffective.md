This diagnostic is issued when a `@clientName` application will not affect the generated name.

## Impact

- **Area:** SDK naming customization. Blocks or rejects a `@clientName` placement that TCGC will not use for the generated declaration.
- **Not affected:** The original service operation or type shape is unchanged.

## ❌ Incorrect Usage

```typespec
@service
namespace KeyVault {
  op getSecret(secretName: string): void;
}

@clientName("listSecretProperties") // applied to the override method instead of `KeyVault.getSecret`
op getSecretOverride(secretName: string): void;
@@override(KeyVault.getSecret, getSecretOverride);
```

## Diagnostic Message

TCGC reports:

```text
Application of @clientName decorator to listSecretProperties is not effective because it is applied to the override method. Please apply it on the original method definition "getSecret" instead.
```

## ✅ How to Fix

Move `@clientName` to the declaration TCGC actually generates, such as the original operation when using `@override`:

```typespec
@service
namespace KeyVault {
  @clientName("listSecretProperties")
  op getSecret(secretName: string): void;
}
```
