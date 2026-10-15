ARM resource path segments must contain only alphanumeric characters or dashes, starting with a lowercase letter.

## Impact

- **Area:** API, SDK

Invalid characters in a path segment produce an invalid ARM API and invalid parameter names.

## ❌ Incorrect

```tsp
model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource, SegmentName = "/foo/bar">;
}
```

## ✅ Correct

```tsp
model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
}
```

## Suppression

Treat like any invalid path segment and require a fix. Use only valid characters in the `@key` for the path segment.
