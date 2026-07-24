Tracked Resources must use 3 or fewer levels of nesting. Deeply nested resources make the API harder to use and are discouraged by ARM guidelines.

## Impact

- **Area:** API

Nesting resources beyond three levels violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [TrackedResourceBeyondThirdLevel](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

// 4 levels of nesting: A > B > C > D — too deep
model A is TrackedResource<{}> {
  ...ResourceNameParameter<A>;
}

@parentResource(A)
model B is TrackedResource<{}> {
  ...ResourceNameParameter<B>;
}

@parentResource(B)
model C is TrackedResource<{}> {
  ...ResourceNameParameter<C>;
}

@parentResource(C)
model D is TrackedResource<{}> {
  ...ResourceNameParameter<D>;
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

// 3 levels of nesting: A > B > C
model A is TrackedResource<{}> {
  ...ResourceNameParameter<A>;
}

@parentResource(A)
model B is TrackedResource<{}> {
  ...ResourceNameParameter<B>;
}

@parentResource(B)
model C is TrackedResource<{}> {
  ...ResourceNameParameter<C>;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise restructure so the resource layout has no more than three levels of nesting.
