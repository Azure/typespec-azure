For a declaration such as `union Choice extends Base`, each model variant must be
`Base` itself or inherit from that exact model, directly or transitively.
The compiler checks structural assignability, but the union's `extends` clause
does not create a model inheritance relationship.

Use `model Derived extends Base` to establish the hierarchy required by SDKs in
nominally typed languages. Matching properties, spreading `Base`, or writing
`model Copy is Base` does not establish that relationship.

#### ❌ Incorrect

```tsp
model Pet {
  name: string;
}

model Cat {
  name: string;
  toy: string;
}

model Dog is Pet;

union Pets extends Pet {
  cat: Cat,
  dog: Dog,
}
```

#### ✅ Correct

```tsp
model Pet {
  name: string;
}

model Cat extends Pet {
  toy: string;
}

model Dog extends Pet {}

model WorkingDog extends Dog {
  job: string;
}

union Pets extends Pet {
  cat: Cat,
  dog: WorkingDog,
  other: Pet,
}
```

## Scope

- Aliases resolve to the underlying model; they neither create nor remove inheritance.
- The declared base itself is allowed because it already belongs to the required
  nominal hierarchy; an artificial empty subtype is unnecessary.
- `model Copy is Derived` is allowed when the compiler preserves a base-model
  chain that reaches `Base`. Copying `Base` itself, or spreading a derived model's
  properties, is not enough.
- Inline models are checked by the same inheritance rule.
- Concrete union template instantiations reached by the semantic walker are
  checked; uninstantiated template declarations are not. A model template base
  must match the exact instantiation, not just have a compatible shape.
- Unions without `extends`, non-model constraints, and non-model variants are
  unchanged. The rule does not prohibit a model from appearing in multiple unions.
- Diagnostics target the offending union variant, not its model declaration.
  Imported library declarations are excluded by the compiler's linter.

## Enable the rule

This SDK-specific rule is enabled by the
`@azure-tools/typespec-azure-rulesets/client-sdk` ruleset, not by the data-plane or
resource-manager rulesets alone. Enable the compiler's experimental `union-extends`
feature when using this syntax:

```yaml
kind: project
features:
  - union-extends
linter:
  extends:
    - "@azure-tools/typespec-azure-rulesets/client-sdk"
```

Alternatively, enable
`@azure-tools/typespec-client-generator-core/use-model-inheritance` individually.

## Impact

- **Area:** SDK

Structurally compatible variants without a shared nominal hierarchy can prevent
SDKs from representing the union through its declared base type. Explicit model
inheritance preserves that relationship for client generation without changing
the compiler's structural assignability rules.

## Suppression

Prefer fixing the model hierarchy with `model extends`. Suppression is appropriate
only when an existing SDK compatibility requirement prevents that change and the
target emitters can represent the union without the shared hierarchy.
Place the directive above the offending variant:

```tsp
model Pet {
  name: string;
}

model LegacyPet is Pet;

union Pets extends Pet {
  #suppress "@azure-tools/typespec-client-generator-core/use-model-inheritance" "Retain the existing SDK model hierarchy for compatibility."
  legacy: LegacyPet,
}
```
