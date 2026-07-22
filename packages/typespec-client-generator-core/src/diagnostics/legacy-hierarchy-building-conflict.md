This diagnostic is issued when `@hierarchyBuilding` rebases a model hierarchy and a same-named property from the old base chain has a type that does not match the property supplied by the new base chain.

To fix this issue, align the property types between the child and the new base chain, or remove the conflicting property from the child model.

### Example

```typespec
using Azure.ClientGenerator.Core.Legacy;

model C {
  shared?: int32;
}

model OldBase {
  shared?: string;
}

@hierarchyBuilding(C)
model A extends OldBase {
  a?: string;
}

@route("/test")
op test(): A;
```

The old base chain supplies `shared` as `string`, but the new base `C` supplies `shared` as `int32`; align the property types or remove the conflicting property.
