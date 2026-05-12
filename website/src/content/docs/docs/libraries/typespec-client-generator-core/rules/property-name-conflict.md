---
title: property-name-conflict
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/property-name-conflict
```

A property whose name matches its enclosing model's name causes problems with
some language emitters (notably C#), where the generated property would
collide with the type name. Rename the property, or use `@clientName` to
rename it for the affected language.

#### ❌ Incorrect

```tsp
model Widget {
  widget: string;
}
```

#### ✅ Correct (rename the property)

```tsp
model Widget {
  name: string;
}
```

#### ✅ Correct (rename only for C#)

```tsp
model Widget {
  @clientName("widgetName", "csharp")
  widget: string;
}
```
