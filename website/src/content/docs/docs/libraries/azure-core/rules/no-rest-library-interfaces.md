---
title: "no-rest-library-interfaces"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-rest-library-interfaces
```

Resource interfaces from the `TypeSpec.Rest.Resource` library are incompatible with `Azure.Core`. Use the Azure.Core resource operation patterns instead.

#### ❌ Incorrect

Extending from `TypeSpec.Rest.Resource.ResourceOperations`:

```tsp
@route("bad")
interface Widgets
  extends TypeSpec.Rest.Resource.ResourceOperations<Widget, Foundations.ErrorResponse> {}
```

#### ✅ Correct

Define a custom interface using Azure.Core operations:

```tsp
interface MyResourceOperations<TResource extends TypeSpec.Reflection.Model> {
  read is ResourceRead<TResource>;
}

@route("good")
interface Widgets extends MyResourceOperations<Widget> {}
```
