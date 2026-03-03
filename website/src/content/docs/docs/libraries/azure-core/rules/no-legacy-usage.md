---
title: "no-legacy-usage"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-legacy-usage
```

Types, decorators and other constructs from located under a `.Legacy` namespace are considered legacy and should not be used in new code. The only acceptable usage is for brownfield services which have their existing pattern grandfathered in.

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
