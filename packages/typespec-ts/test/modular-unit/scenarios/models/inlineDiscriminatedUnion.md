# Transitive inline-discriminated union dispatch

Variants behind an untagged intermediate model must remain in the union and in both serialization dispatchers.

```tsp
model PetBase {
  name: string;
}

model Mammal extends PetBase {
  age?: int32;
}

model Cat extends Mammal {
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

@post
op echo(@body body: Pet): Pet;
```

```ts models alias PetBaseUnion
/** Alias for PetBaseUnion */
export type PetBaseUnion = Cat | Dog | PetBase;
```

```ts models function petBaseUnionSerializer
export function petBaseUnionSerializer(item: PetBaseUnion): any {
  switch (item.kind) {
    case "cat":
      return catSerializer(item as Cat);

    case "dog":
      return dogSerializer(item as Dog);

    default:
      return petBaseSerializer(item);
  }
}
```

```ts models function petBaseUnionDeserializer
export function petBaseUnionDeserializer(item: any): PetBaseUnion {
  switch (item["kind"]) {
    case "cat":
      return catDeserializer(item as Cat);

    case "dog":
      return dogDeserializer(item as Dog);

    default:
      return petBaseDeserializer(item);
  }
}
```
