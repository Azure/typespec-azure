---
title: no-unnamed-types
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/no-unnamed-types
```

Types used in the public client surface should be named explicitly rather
than defined anonymously or inline. Anonymous types receive a generated
name in emitted SDKs, which hurts readability and makes the type hard to
reuse. Promoting these types to named declarations leads to better,
more idiomatic generated code.

This rule reports anonymous models and unions that end up referenced from
the client surface with a generated name.

#### ❌ Incorrect (inline anonymous model)

```tsp
op create(): {
  id: string;
  name: string;
};
```

#### ✅ Correct (named model)

```tsp
model Widget {
  id: string;
  name: string;
}

op create(): Widget;
```

#### ❌ Incorrect (inline anonymous union)

```tsp
op getColor(): "red" | "green" | "blue";
```

#### ✅ Correct (named union)

```tsp
union Color {
  red: "red",
  green: "green",
  blue: "blue",
}

op getColor(): Color;
```
