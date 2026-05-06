---
title: arm-no-replace-inherited-props
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props
```

Warns when a model redefines a property that is already defined in one of its base models. Repeating inherited properties in a child model is an anti-pattern for Azure APIs and can cause problems with OpenAPI tooling and some language representations of the models.

The `name` property of an ARM resource and properties redefined as part of a model marked with `@discriminator` are not flagged by this rule.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model Base {
  id: string;
  commonProp: string;
}

model Child extends Base {
  commonProp: string; // duplicate of inherited "commonProp"
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

#### ✅ Correct (discriminator property)

```tsp
@armProviderNamespace
namespace MyService;

@discriminator("kind")
model Pet {
  kind: string;
  weight: int32;
}

model Cat extends Pet {
  kind: "cat"; // allowed: 'kind' is a discriminator property
  meow: boolean;
}
```
