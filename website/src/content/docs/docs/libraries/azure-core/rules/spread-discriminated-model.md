---
title: "spread-discriminated-model"
---

```text title="Full name"
@azure-tools/typespec-azure-core/spread-discriminated-model
```

A model using `@discriminator` is meant to be used in a polymorphic context. It should be extended to represent the relation.
Spreading this model is a sign that either the `@discriminator` decorator is unnecessary or that `model extends` should have been used instead.

#### ❌ Incorrect

```tsp
@discriminator("kind")
model Pet {
  kind: string;
}

model Cat {
  ...Pet;
  meow: boolean;
}
```

#### ✅ Correct

```tsp
model Pet {
  kind: string;
}

model Cat {
  ...Pet;
  meow: boolean;
}
```

```tsp
@discriminator("kind")
model Pet {
  kind: string;
}

model Cat extends Pet {
  kind: "cat";
  meow: boolean;
}
```
