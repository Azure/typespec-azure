This diagnostic is issued when an inline-discriminated union's discriminator property or tag mappings conflict with another union or an existing model discriminator in the same hierarchy.

## Impact

- **Area:** SDK union type conversion. Generation continues with the union representation instead of overwriting conflicting discriminator metadata.
- **Not affected:** The TypeSpec union declaration, service routes, and wire payloads are unchanged.

## ❌ Incorrect Usage

```typespec
@service
namespace Example;

model PetBase {
  name: string;
}

model Cat extends PetBase {
  meows: boolean;
}

@discriminated(#{ envelope: "none" })
union Pet extends PetBase {
  cat: Cat,
  feline: Cat, // one model cannot have two polymorphic discriminator values
}

op get(): Pet;
```

## Diagnostic Message

TCGC reports:

```text
Cannot convert discriminated union 'Pet' to a model hierarchy because its discriminator metadata conflicts with another union or model using the same hierarchy. The union is preserved. Set convertDiscriminatedUnionsToModels to false to retain union representations.
```

## ✅ How to Fix

Use consistent discriminator properties and tag mappings throughout the shared hierarchy. Give each alternative with a different wire tag its own model.

```typespec
@service
namespace Example;

model PetBase {
  name: string;
}

model Cat extends PetBase {
  meows: boolean;
}

model Dog extends PetBase {
  barks: boolean;
}

@discriminated(#{ envelope: "none" })
union Pet extends PetBase {
  cat: Cat,
  dog: Dog,
}

op get(): Pet;
```

Emitters that intentionally use native discriminated unions can set `convertDiscriminatedUnionsToModels: false` in `createSdkContext` instead of requesting polymorphic conversion.

## Suppression

This diagnostic should not be suppressed. Align the hierarchy's discriminator metadata, or disable conversion when the emitter intentionally retains discriminated unions.
