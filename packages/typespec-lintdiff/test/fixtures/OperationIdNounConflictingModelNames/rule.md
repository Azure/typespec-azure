---
validatorRuleId: OperationIdNounConflictingModelNames
engine: spectral
coverageKind: partial
tspLints:
  - tsp-lintdiff-local-linter/no-operation-group-name-conflict
---

# no-operation-group-name-conflict

**Severity:** warning

**Applies to:** Both ARM and DataPlane

## Description

Give operation groups names that differ from the named types used by the same
root client's API. A group is a subclient formed by an interface, a namespace,
or supported client grouping metadata. Root methods do not create groups.
For example, name the group `Widgets` rather than `Widget` when the API uses a
`Widget` model.

The rule compares exact, case-sensitive **common SDK names**, including common
`@clientName`, `@client`, and `@clientLocation` metadata. Overrides scoped
exclusively to named languages do not change this check. Common names follow
TCGC's `AllScopes` selection, including its fallback metadata for negated scopes
such as `!javascript`. Complete names are preserved: `Widget_Admin` and `Widget`
are different names.

Named models, scalars, enums and unions reachable from the client's parameter
and return types participate, including shared and nested types, base types and
their members, and concrete template instances. A referenced discriminated model
also includes its supported alternatives. Merely sharing a base with an API model
does not make another subtype part of that API. Anonymous types have no name to compare,
but their named children participate. Unused declarations and types used only by
another root client do not participate. The supported SDK naming API supplies
template names; the rule does not invent names for anonymous types.

Parameter and model-property `@scope` metadata also applies: language-only
properties do not contribute types to the common API. A reference to an enum
member contributes its owning enum's name. A selected union variant contributes
its owner's name when the common SDK represents that owner as an enum; otherwise
only the selected value is followed, not the union's unrelated alternatives.

There is one warning per conflicting group, regardless of the number of methods
or matching types. It targets the authored interface or namespace. A virtual or
merged group without a declaration is reported on its first operation.

### Incorrect

```tsp
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
model Widget {
  id: string;
}
namespace Operations {
  interface Widgets {
    @get read(): Example.Widget;
  }
}
```

These generic HTTP examples assume `using TypeSpec.Http;` and
`@service namespace Example;`.

## Historical migration mapping

This guideline replaces the local implementation historically mapped to
`OperationIdNounConflictingModelNames`. The
[validator source](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/operation-id-noun-conflicting-model-names.ts)
and [validator documentation](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/operation-id-noun-conflicting-model-names.md)
describe a different check: an operation ID prefix against Swagger definitions.
The native rule does not split operation names, simulate casing, inspect emitted
definitions, or exempt native types because of external references.
See [migration evidence](./migration.md) for intentional differences and counts.
