This diagnostic is issued when a `@clientName` application will not affect the generated name.

To fix this issue, move `@clientName` to the declaration TCGC actually generates, such as the original operation when using `@override`.

### Example

Instead of naming the override operation:

```typespec
@service
namespace KeyVault {
  op getSecret(secretName: string): void;
}

@clientName("listSecretProperties")
op getSecretOverride(secretName: string): void;
@@override(KeyVault.getSecret, getSecretOverride);
```

Apply `@clientName` to the original operation that TCGC generates:

```typespec
@service
namespace KeyVault {
  @clientName("listSecretProperties")
  op getSecret(secretName: string): void;
}
```
