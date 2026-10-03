Give operation groups names that differ from the named types used by the same root
client's API. A group is a subclient formed by an interface, a namespace, or supported
client grouping metadata. Root methods do not create groups. For example, name the
group `Widgets` rather than `Widget` when the API uses a `Widget` model.

The rule compares exact, case-sensitive **common SDK names**, including common
`@clientName`, `@client`, and `@clientLocation` metadata. Overrides scoped exclusively
to named languages do not change this check. Common names follow TCGC's `AllScopes`
selection, including fallback metadata for negated scopes such as `!javascript`.
Complete names are preserved: `Widget_Admin` and `Widget` are different names.

Named models, scalars, enums and unions reachable from the client's parameter and
return types participate, including shared and nested types, base types and their
members, and concrete template instances. A referenced discriminated model also
includes its supported alternatives. Merely sharing a base with an API model does
not make another subtype part of that API. Anonymous types have no name to compare,
but their named children participate. Unused declarations and types used only by
another root client do not participate.

Parameter and model-property `@scope` metadata also applies: language-only properties
do not contribute types to the common API. A reference to an enum member contributes
its owning enum's name. A selected union variant contributes its owner's name when
the common SDK represents that owner as an enum; otherwise only the selected value
is followed, not the union's unrelated alternatives.

There is one warning per conflicting group, regardless of the number of methods or
matching types. It targets the authored interface or namespace. A virtual or merged
group without a declaration is reported on its first operation.

## Impact

- **Area:** SDK API naming. A group and a type with the same name can force client
  generators to rename one of them, producing unexpected APIs.
- **Compatibility:** Renaming a group after an SDK ships can break client code.

## Examples

### Incorrect

```tsp
using TypeSpec.Http;

@service
namespace Example;

model Widget {
  id: string;
}
namespace Operations {
  interface Widget {
    @get read(): Example.Widget;
  }
}
```

### Correct

```tsp
using TypeSpec.Http;

@service
namespace Example;

model Widget {
  id: string;
}
namespace Operations {
  interface Widgets {
    @get read(): Example.Widget;
  }
}
```

## Suppression

Suppress the warning only when preserving an already shipped SDK group name is more
important than removing the naming conflict. Add
`#suppress "@azure-tools/typespec-client-generator-core/no-operation-group-name-conflict" "Preserve the shipped SDK group name."`
to the reported group declaration, or to the reported operation for a virtual group.
Include the specific compatibility reason.

## LintDiff Equivalent

Historical migration mapping:
[`OperationIdNounConflictingModelNames`](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/operation-id-noun-conflicting-model-names.md)
([automated guideline R2063](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2063)).
That validator compares serialized operation ID prefixes with Swagger definitions.
This native guideline deliberately differs: it does not split operation names,
guess emitted casing, approximate schema inlining, or exempt reachable types based
on external references. See the
[source migration evidence](https://github.com/Azure/typespec-azure/blob/feature/lintdiff-operation-id-noun-conflicting-model-names/packages/typespec-lintdiff/test/fixtures/OperationIdNounConflictingModelNames/migration.md)
for the comparison and its limits; this mapping is not a claim of equivalence.
