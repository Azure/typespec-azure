Named unions must declare an `extends` constraint. For a declaration such as
`union Pet extends PetBase`, each model variant must be `PetBase` itself or inherit
from that exact model, directly or transitively. A model can be a variant of only
one union with a model `extends` constraint.
The compiler checks structural assignability, but the union's `extends` clause
does not create a model inheritance relationship.

Use `model Cat extends PetBase` to establish the hierarchy required by SDKs in
nominally typed languages. Matching properties, spreading `PetBase`, or writing
`model Dog is PetBase` does not establish that relationship.

#### ❌ Incorrect

```tsp
model PetBase {
  name: string;
}

model Cat {
  name: string;
  toy: string;
}

model Dog is PetBase;

union Pet extends PetBase {
  cat: Cat,
  dog: Dog,
}
```

#### ✅ Correct

```tsp
model PetBase {
  name: string;
}

model Cat extends PetBase {
  toy: string;
}

model Dog extends PetBase {}

model WorkingDog extends Dog {
  job: string;
}

union Pet extends PetBase {
  cat: Cat,
  dog: WorkingDog,
  other: PetBase,
}
```

## Declare a constraint

A named union without an `extends` constraint is reported even when its variants
already share a base model. Add the constraint explicitly:

```tsp
model PetBase {
  name: string;
}

model Cat extends PetBase {}
model Dog extends PetBase {}

union Pet extends PetBase {
  Cat,
  Dog,
}
```

Non-model constraints are also allowed, for example
`union Color extends string { "red", "blue" }`. These unions do not need a model
inheritance hierarchy.

## Keep model variants in one hierarchy

Do not list the same model in multiple unions with model `extends` constraints:

```tsp
model PetBase {
  name: string;
}

model Cat extends PetBase {}
model Dog extends PetBase {}

union Pet extends PetBase {
  Cat,
  Dog,
}

// Incorrect: Cat already belongs to Pet.
union IndoorPet extends PetBase {
  Cat,
}
```

Reuse `Pet` rather than defining a second union containing `Cat`. Distinct unions
may share `PetBase` as their constraint when their model variants are distinct.

## Scope

- Aliases resolve to the underlying model; they neither create nor remove inheritance.
- The declared base itself is allowed because it already belongs to the required
  nominal hierarchy; an artificial empty subtype is unnecessary.
- `model Copy is Derived` is allowed when the compiler preserves a base-model
  chain that reaches `PetBase`. Copying `PetBase` itself, or spreading a derived model's
  properties, is not enough.
- Inline models are checked by the same inheritance rule.
- Concrete union template instantiations reached by the semantic walker are
  checked; uninstantiated template declarations are not. A model template base
  must match the exact instantiation, not just have a compatible shape.
- Unnamed unions do not require an `extends` constraint. Unconstrained unions and
  union expressions such as `Cat | null` do not claim ownership of model variants.
- Non-model constraints and non-model variants are not subject to the model
  inheritance or ownership checks.
- Repeating a model within the same union is allowed. Aliases of a model refer to
  the same model for ownership checks, but distinct model template instantiations
  are distinct models.
- A missing constraint is reported on the named union. Inheritance and ownership
  diagnostics target the offending union variant, not its model declaration.
  Reuse is reported on variants in each union visited after the first owning union.
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
`@azure-tools/typespec-client-generator-core/use-union-hierarchy` individually.

## Impact

- **Area:** SDK

Structurally compatible variants without a shared nominal hierarchy can prevent
SDKs from representing the union through its declared base type. Explicit model
inheritance preserves that relationship for client generation without changing
the compiler's structural assignability rules. Keeping each model variant in a
single union hierarchy avoids incompatible SDK inheritance requirements.

## Suppression

Do not suppress this rule. Declare the union's `extends` constraint, use
`model extends` to establish its model hierarchy, and keep each model variant in
one union hierarchy. Suppression does not make an unsupported hierarchy
representable in nominally typed SDKs.
