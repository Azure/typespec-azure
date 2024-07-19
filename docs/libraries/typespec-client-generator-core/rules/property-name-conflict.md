---
title: "property-name-conflict"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/property-name-conflict
```

Verify that there isn't a name conflict between a property in the model, and the name of the model itself

#### ❌ Incorrect

```ts
model Widget {
  widget: string;
}
```

#### ✅ Ok

Using items from a private namespace within the same library is allowed.

```ts
model Widget {
  widgetName: string;
}
```
