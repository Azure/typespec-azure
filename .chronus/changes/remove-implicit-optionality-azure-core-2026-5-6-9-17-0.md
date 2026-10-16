---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-core"
---

Removed `implicitOptionality: true` from the `@patch` decorator on the following operation templates:

- `ResourceCreateOrUpdate`
- `LongRunningResourceCreateOrUpdate`
- `ResourceUpdate`

Previously, these templates used `@patch(#{ implicitOptionality: true })` which caused all properties in the PATCH request body to be implicitly treated as optional, regardless of how they were declared in the model. This behavior is now removed — properties will retain their declared optionality.

#### Migration

If your service relies on all properties being optional in the PATCH body, you need to explicitly mark them as optional in your model:

**Before** (implicit optionality made all properties optional automatically):

```tsp
model Widget {
  name: string;
  color: string;
}
```

**After** (explicitly declare optional properties):

```tsp
model WidgetUpdate {
  name?: string;
  color?: string;
}
```

Alternatively, you can use the `ResourceUpdateModel` template or `OptionalProperties` utility to derive an all-optional version of your model for PATCH operations. If you were already using `ResourceUpdateModel<Resource>` or manually defining optional properties in your update model, no changes are needed.
