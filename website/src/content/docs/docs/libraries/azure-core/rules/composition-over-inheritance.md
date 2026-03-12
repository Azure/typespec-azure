---
title: "composition-over-inheritance"
---

```text title="Full name"
@azure-tools/typespec-azure-core/composition-over-inheritance
```

Models that extend a base model without a discriminator should use composition (`...` spread or `model is`) instead of inheritance (`extends`). If polymorphism is intended, add the `@discriminator` decorator on the base model.

#### ❌ Incorrect

Inheritance without a discriminator:

```tsp
model Pet {
  name: string;
}

model Cat extends Pet {
  meow: boolean;
}
```

Extending a template instance:

```tsp
model Pet<T> {
  t: T;
}

model Cat extends Pet<string> {}
```

#### ✅ Correct

Using composition with spread:

```tsp
model Pet {
  name: string;
}

model Cat {
  ...Pet;
  meow: boolean;
}
```

Using `model is`:

```tsp
model Pet {
  name: string;
}

model Cat is Pet {
  meow: boolean;
}
```

Inheritance with a discriminator for polymorphism:

```tsp
@discriminator("kind")
model Pet {
  kind: string;
  name: string;
}

model Cat extends Pet {
  kind: "cat";
  meow: boolean;
}

model Dog extends Pet {
  kind: "dog";
  bark: boolean;
}
```
