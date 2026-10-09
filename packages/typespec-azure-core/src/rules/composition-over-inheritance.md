Models that extend a base model without a discriminator should use composition (`...` spread or `model is`) instead of inheritance (`extends`). If polymorphism is intended, add the `@discriminator` decorator on the base model.

## Impact

- **Area:** SDK

Deep inheritance is hard for SDKs to represent and reduces client usability.

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

## Suppression

Suppress when inheritance is genuinely required; otherwise prefer `model is` or spread (`...`) instead of `extends`.
