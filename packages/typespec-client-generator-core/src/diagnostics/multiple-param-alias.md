This diagnostic is issued when more than one `@paramAlias` is applied to the same model property in the same effective scope.

## Impact

- **Area:** Client initialization parameter naming. Generation continues using the first alias, while later aliases for the same scoped parameter are ignored.
- **Not affected:** Operation-level parameter names and wire names are unchanged.

## ❌ Incorrect Usage

```typespec
model ClientOptions {
  account: string;
}

@@paramAlias(ClientOptions.account, "accountName");
@@paramAlias(ClientOptions.account, "storageAccountName"); // second alias for the same parameter scope
```

## Diagnostic Message

For the declaration above, TCGC reports:

```text
Multiple param aliases applied to 'account'. Only the first one 'accountName' will be used.
```

## ✅ How to Fix

Keep only one alias for the property in a given scope, or scope the aliases so only one applies to each emitter.

```typespec
model ClientOptions {
  account: string;
}

@@paramAlias(ClientOptions.account, "accountName");
```

## Suppression

Suppress this warning only if the first `@paramAlias` is the intended alias and later aliases are deliberately ignored.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/multiple-param-alias" "first parameter alias is intentional"
```
