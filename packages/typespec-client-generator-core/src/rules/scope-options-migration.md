This rule flags decorator calls that use the legacy positional string `scope` argument and offers a code fix to convert it to the typed `#{ scope: "..." }` options bag.

Both forms are fully supported and this rule is informational only — migrating is optional and there is no deprecation timeline for the legacy string form. See the [scope options migration guide](https://github.com/Azure/typespec-azure/blob/main/packages/typespec-client-generator-core/design-docs/scope-options-migration.md) for details.

#### ❌ Flagged (still valid, migration optional)

```tsp
@clientName("RenamedName", "csharp")
op myOperation(): void;
```

#### ✅ Suggested fix

```tsp
@clientName("RenamedName", #{ scope: "csharp" })
op myOperation(): void;
```
