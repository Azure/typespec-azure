---
title: arm-no-replace-inherited-props
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props
```

Warns when a model redefines a property that is already defined in one of its base models. Repeating inherited properties in a child model is an anti-pattern for Azure APIs and can cause problems with OpenAPI tooling and some language representations of the models.

Overriding an inherited property is allowed when both the inherited property and the overriding property are "compatible scalars" — that is, both reduce to the same scalar family (`string`, `numeric`, or `boolean`). For example, an inherited property of type `string` may be overridden by a `string`, by a scalar that extends `string`, by a string literal, by a string-valued enum, or by an open or closed string union.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model Inner {
  a: string;
}

model Base {
  nested: Inner;
}

model Child extends Base {
  nested: Inner; // duplicate of inherited "nested"
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model Base {
  id: string;
  commonProp: string;
}

model Child extends Base {
  otherProp: string;
}
```

#### ✅ Correct (compatible scalar override)

```tsp
@armProviderNamespace
namespace MyService;

@discriminator("kind")
model Pet {
  kind: string;
  weight: int32;
}

model Cat extends Pet {
  kind: "cat"; // allowed: string and string literal are compatible scalars
  meow: boolean;
}
```
