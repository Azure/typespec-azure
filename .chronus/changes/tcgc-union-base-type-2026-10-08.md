---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Expose a union's explicit `extends` constraint through `SdkUnionType.baseType`. The base type receives the union's usage, access, and serialization information. TCGC leaves `baseType` undefined when variants only happen to share a common ancestor.

```typespec
model PetBase {
  name: string;
}

model Cat extends PetBase {
  meow: boolean;
}

model Dog extends PetBase {
  bark: boolean;
}

union Pet extends PetBase {
  cat: Cat,
  dog: Dog,
}
```
