This diagnostic is issued when more than one `@paramAlias` is applied to the same model property in the same effective scope.

To fix this issue, keep only one alias for the property in a given scope, or scope the aliases so only one applies to each emitter.

### Example

```typespec
model ClientOptions {
  account: string;
}

@@paramAlias(ClientOptions.account, "accountName");
@@paramAlias(ClientOptions.account, "storageAccountName");
```

Only the first alias is used; keep one alias per effective scope.
