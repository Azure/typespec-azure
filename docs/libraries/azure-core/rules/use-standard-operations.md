---
title: "use-standard-operations"
---

```text title="Full name"
@azure-tools/typespec-azure-core/use-standard-operations
```

Azure Data Plane services should use standard operations defined in the Azure Core library.

#### ❌ Incorrect

```tsp
op myResourceRead(): MyResource;
op myResourceCreate(@body resource: MyResource);
```

Using operations from `Azure.Core.Foundations` it not acceptable either.

```tsp
op myResourceRead is Azure.Core.Foundations.Operation<{}, MyResource>;
op myResourceCreate is Azure.Core.Foundations.Operation<MyResource, void>;
```

#### ✅ Correct

```tsp
alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

op myResourceRead is Operations.ResourceRead<MyResource>;
op myResourceCreate is Operations.ResourceCreate<MyResource>;
```
