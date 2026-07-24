Check the resource name. ARM resource model names must contain only alphanumeric characters (starting with an uppercase letter), and the `name` property must be a read-only `@path` parameter.

## Impact

- **Area:** API, SDK

Invalid characters in a resource name violate the RPC contract and produce invalid client parameter names, preventing SDK generation.

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

## Suppression

Treat like any invalid resource name and require a fix. Use only valid characters.
