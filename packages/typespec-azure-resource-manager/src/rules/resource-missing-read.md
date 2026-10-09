An ARM resource with a create or update lifecycle operation must also provide a read operation.
Clients need to retrieve the resource state after creating or updating it.

Define `ArmResourceRead<Resource>` alongside the resource's create/update operations. A collection
list does not replace a read of an individual resource. Delete-only resources are outside this
rule's scope.

## Impact

- **Area:** API

Without a read operation, clients cannot retrieve the state of a resource they can create or update.
The rule reports one warning per resource, on the concrete interface declaring its registered
create/update operation. Having both create and update operations does not produce two warnings.

## ❌ Incorrect

For an existing `Widget` resource with `WidgetProperties`, this interface omits the read operation:

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmResourcePatchSync<Widget, WidgetProperties>;
}
```

## ✅ Correct

Add a read using the standard ARM resource operation template:

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmResourcePatchSync<Widget, WidgetProperties>;
  get is ArmResourceRead<Widget>;
}
```

These examples assume a model such as
`model Widget is TrackedResource<WidgetProperties> { ...ResourceNameParameter<Widget>; }`,
with a named properties model such as `model WidgetProperties { label?: string; }`.

## Suppression

Prefer adding the standard read operation. Suppress this rule only when an ARM reviewer approves
a resource design that intentionally cannot be read; include the approval reason in the
`#suppress` directive on the resource operation interface.

## LintDiff Equivalent

This rule corresponds to
[AllResourcesMustHaveGetOperation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/all-resources-must-have-get-operation.md).
It checks registered native ARM lifecycle roles, not emitted response references. Legacy HTTP GET
operations without ARM read metadata do not satisfy this check; registered reads with customized
responses do. Full executable Swagger equivalence is not claimed. The discriminator-ancestor
exemption is retained, but a clean supported polymorphic ARM fixture has not been established.
