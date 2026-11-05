This diagnostic is issued when converting an inline-discriminated union whose variant models or their ancestors use `@discriminator`.

## Impact

- **Area:** SDK union type conversion. TCGC reports an error and does not convert the union or overwrite the model hierarchy's existing discriminator metadata.
- **Not affected:** Ordinary unions, object-envelope unions, and emitters that disable discriminated-union conversion.

## Incorrect Usage

```typespec
@service
namespace Example;

@discriminator("kind")
model PetBase {
  kind: string;
}

model Cat extends PetBase {
  kind: "cat";
}

@discriminated(#{ envelope: "none" })
union Pet extends PetBase {
  cat: Cat,
}

op get(): Pet;
```

## Diagnostic Message

```text
Discriminated union 'Pet' cannot be converted to a polymorphic SDK model because model 'PetBase' in its hierarchy uses @discriminator. Use @discriminated on the union without @discriminator on its model hierarchy, or set `convertDiscriminatedUnionsToModels` to `false` to retain union representations.
```

## How to Fix

Remove `@discriminator` from the model hierarchy and let the discriminated union define the tags.

```typespec
@service
namespace Example;

model PetBase {
  kind: string;
}

model Cat extends PetBase {
  kind: "cat";
}

@discriminated(#{ envelope: "none" })
union Pet extends PetBase {
  cat: Cat,
}

op get(): Pet;
```

Alternatively, keep model-based polymorphism and use `PetBase` directly instead of the discriminated union. Emitters that intentionally retain native union representations can set `convertDiscriminatedUnionsToModels: false` in `createSdkContext`.

## Suppression

This diagnostic should not be suppressed. Use one discriminator mechanism for the hierarchy, or disable union conversion.
