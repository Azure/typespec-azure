The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

## ❌ Incorrect

```tsp
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

model MyBadPatch {
  name?: string;
  ...Foundations.ArmTagsProperty;
  blah?: string; // does not exist on FooResource
}
```

## ✅ Correct

```tsp
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

model FooPatch {
  name?: string;
  ...Foundations.ArmTagsProperty;
  properties?: FooProperties;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise use the standard PATCH operations.
