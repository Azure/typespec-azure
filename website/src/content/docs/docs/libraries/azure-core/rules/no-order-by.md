---
title: "no-order-by"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-order-by
```

List operations with an `orderBy` parameter are uncommon. Support should only be added after large collection sorting performance concerns are considered. The rule specifically targets `Azure.Core.ResourceList` operations.

#### ❌ Incorrect

Using `OrderByQueryParameter` in a `ResourceList`:

```tsp
alias MyTraits = Azure.Core.Traits.QueryParametersTrait<OrderByQueryParameter>;

op list is Azure.Core.ResourceList<TestModel, MyTraits>;
```

Inline `orderBy` query parameter in a `ResourceList`:

```tsp
alias MyTraits = Azure.Core.Traits.QueryParametersTrait<{
  @query orderBy: string;
}>;

op list is Azure.Core.ResourceList<TestModel, MyTraits>;
```

#### ✅ Correct

`ResourceList` without `orderBy`:

```tsp
op list is Azure.Core.ResourceList<TestModel>;
```
