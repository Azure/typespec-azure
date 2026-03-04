---
title: "resource-name"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/resource-name
```

Check the resource name. ARM resource model names must contain only alphanumeric characters (starting with an uppercase letter), and the `name` property must be a read-only `@path` parameter.

#### ❌ Incorrect

Missing `@path` decorator on `name`:

```tsp
model FooResource is TrackedResource<{}> {
  @key("foo")
  @segment("foo")
  name: string;
}
```

#### ❌ Incorrect

Underscore in model name:

```tsp
model Foo_Resource is TrackedResource<{}> {
  ...ResourceNameParameter<Foo_Resource>;
}
```

#### ✅ Correct

```tsp
model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
}
```
