Give an interface or namespace containing operations a name that differs from the
models, scalars, enums and unions declared alongside it. For example, name a group
`Widgets` rather than `Widget` when its parent namespace declares a `Widget` model.

The rule compares complete, case-sensitive names within each declared namespace.
It honors `@clientName` overrides in common and explicitly configured language
scopes, as well as friendly names. A group receives at most one warning even if its
name conflicts in several scopes or with several types. The warning targets the
authored interface or namespace.

This is a declaration-based guideline, not a prediction of generated SDK layouts.
Unused named types still participate. Each nested namespace is checked separately;
types referenced from other namespaces do not participate in the local comparison.
The rule does not traverse model properties, inheritance or polymorphic graphs,
construct SDK clients, or interpret `@client` and `@clientLocation` grouping.
Only interfaces with operations and namespaces with directly declared operations
are checked; root operations, empty containers and virtual groups do not create
additional checks.

## Impact

- **Area:** SDK API naming. Conflicting group and type names can force client
  generators to rename one of them, producing unexpected APIs.
- **Compatibility:** Renaming a group after an SDK ships can break client code.

## Examples

### Incorrect

```tsp
model Widget {
  id: string;
}
@clientName("Widget")
interface WidgetOperations {
  @get read(): Widget;
}
```

### Correct

```tsp
model Widget {
  id: string;
}
interface Widgets {
  @get read(): Widget;
}
```

## Suppression

Suppress the warning only when preserving an already shipped SDK group name is more
important than removing the naming conflict. Add
`#suppress "@azure-tools/typespec-client-generator-core/no-operation-group-name-conflict" "Preserve the shipped SDK group name."`
to the reported interface or namespace and include the specific compatibility reason.

## LintDiff Equivalent

Historical migration mapping:
[`OperationIdNounConflictingModelNames`](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/operation-id-noun-conflicting-model-names.md)
([automated guideline R2063](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2063)).
That validator compares serialized operation ID prefixes with Swagger definitions.
This native guideline instead checks declared groups and types in the same namespace.
It does not split operation names, guess emitted casing or approximate schema
reachability. The earlier source
[migration evidence](https://github.com/Azure/typespec-azure/blob/feature/lintdiff-operation-id-noun-conflicting-model-names/packages/typespec-lintdiff/test/fixtures/OperationIdNounConflictingModelNames/migration.md)
describes the previous implementation, not validation of this simplified policy.
