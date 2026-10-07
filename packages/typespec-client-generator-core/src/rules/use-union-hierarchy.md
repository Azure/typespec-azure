Named unions must declare an `extends` constraint unless all their variants are
assignable to `string`. Numeric, model, and other non-string unions require a
constraint, including unions that mix strings with other types.
For a model constraint such as `union Pet extends PetBase`, each model variant must
be `PetBase` itself or inherit from that exact model, directly or transitively.
A model can be a variant of only one union with a model `extends` constraint.
Non-model constraints are not subject to the model inheritance or ownership checks.
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

## Numeric unions

Numeric named unions must declare a constraint even when their variants are
literals rather than models:

```tsp
union Priority extends int32 {
  low: 1,
  high: 2,
}
```

## String unions

String unions do not have to use `extends`. This includes string literals,
extensible strings, scalars derived from `string`, and nested string unions:

```tsp
union Color {
  string,
  red: "red",
  blue: "blue",
}
```

Mixing strings with numeric, model, or `null` variants does not qualify for this
exemption.

Anonymous union expressions such as `Cat | null` also do not require `extends`.

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

## Impact

- **Area:** SDK

Structurally compatible variants without a shared nominal hierarchy can prevent
SDKs from representing the union through its declared base type. Explicit model
inheritance preserves that relationship for client generation without changing
the compiler's structural assignability rules. Keeping each model variant in a
single union hierarchy avoids incompatible SDK inheritance requirements.

## Suppression

Do not suppress this rule. Declare an `extends` constraint for non-string named
unions. When using a model constraint, use `model extends` to establish
the required model hierarchy and keep each model variant in one such union.
Suppression does not make an unsupported hierarchy representable in nominally
typed SDKs.
