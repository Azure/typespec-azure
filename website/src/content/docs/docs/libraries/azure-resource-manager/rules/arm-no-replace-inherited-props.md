---
title: arm-no-replace-inherited-props
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props
```

Warns when a model redefines a property that is already defined in one of its base models. Repeating inherited properties in a child model is an anti-pattern for Azure APIs and can cause problems with OpenAPI tooling and some language representations of the models.

Overriding an inherited property is allowed when:

- The overriding property has the **same type** as the inherited one (by identity). Type aliases resolve to the same underlying type, and template instantiations are cached, so this naturally covers cases such as redefining `systemData: SystemData` (alias) where the parent uses `systemData: Foundations.SystemData`, or the implicit `tags: Record<string>` cloned into a model that uses `is TrackedResource<...>`.
- Both the inherited property and the overriding property are **compatible scalars** — that is, both reduce to the same scalar family (`string`, `numeric`, or `boolean`). For example, an inherited property of type `string` may be overridden by a `string`, by a scalar that extends `string`, by a string literal, by a string-valued enum, or by an open or closed string union.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model InnerBase {
  a: string;
}

model InnerDerived extends InnerBase {
  b: string;
}

model Base {
  nested: InnerBase;
}

model Child extends Base {
  nested: InnerDerived; // narrows the inherited "nested" to a derived model
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
