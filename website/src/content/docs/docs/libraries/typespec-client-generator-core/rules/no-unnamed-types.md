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

## Reviewer advice

Impacts the generated **SDKs**: anonymous inline models and unions on the public client surface receive generated names, which hurts readability and makes them hard to reuse. Ask the author to promote them to named `model` or `union` declarations. Suppression is acceptable when the anonymous type is not actually surfaced on the client, or when needed to match an existing API.

> This rule favors performance over completeness: it walks the type graph directly rather than running the full client generation pass, so some anonymous types (for example those only produced by generated LRO/metadata envelopes) may not be reported.
