Types, decorators and other constructs from located under a `.Legacy` namespace are considered legacy and should not be used in new code. The only acceptable usage is for brownfield services which have their existing pattern grandfathered in.

## Impact

- **Area:** API, SDK

Indicates use of legacy patterns instead of the current standard patterns.

#### ❌ Incorrect

```tsp
model Pet {
  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  name: PetProperties;
}
```

```tsp
model Page {
  @nextLink nextLink: Azure.Core.Legacy.parameterizedNextLink<[
    ListCertificateOptions.includePending
  ]>;
}
```

#### ✅ Correct

```tsp
model Pet {
  name: PetProperties;
}
```

```tsp
model Page {
  @nextLink nextLink: url;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard types and templates.
