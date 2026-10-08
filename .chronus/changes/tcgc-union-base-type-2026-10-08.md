---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Expose a union's explicit `extends` constraint through `SdkUnionType.baseType`. TCGC leaves `baseType` undefined when variants only happen to share a common ancestor.

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
