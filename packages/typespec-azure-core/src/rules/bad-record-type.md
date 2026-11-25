Use of `Record<X>` should be limited in Azure services.

1. It is recommended to use `Record<string>` instead of `Record<unknown>`
2. Specifying a type with Record and some known properties is also not recommended.

For named record models, the warning is reported at the model definition, not at each property that references it.

## Impact

- **Area:** SDK, API

Records typed with non-concrete element types cannot be represented cleanly in SDKs and force clients to work with untyped dictionaries.

#### ❌ Incorrect

```tsp
model Pet {
  data: Record<unknown>;
}
```

```tsp
model Pet is Record<string> {
  name: string;
}
```

#### ✅ Correct

```tsp
model Pet {
  tags: Record<string>;
}
```

```tsp
model Pet is Record<string>;
```

## Suppression

Suppress only when an open-ended dictionary is genuinely required; otherwise give the record a concrete element type.
For a named record model, suppress the warning on the model definition.
