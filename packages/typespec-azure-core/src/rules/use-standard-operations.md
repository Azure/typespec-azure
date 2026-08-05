Azure Data Plane services should use standard operations defined in the Azure Core library.

## Impact

- **Area:** API, SDK

Custom operations that bypass the standard templates can lose the resource semantics used by emitters and tooling.

#### ❌ Incorrect

```tsp
op myResourceRead(): MyResource;
op myResourceCreate(@body resource: MyResource);
```

Using operations from `Azure.Core.Foundations` is not acceptable either.

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

## Suppression

Suppress only when required to match an existing API; otherwise use the standard operation templates.
