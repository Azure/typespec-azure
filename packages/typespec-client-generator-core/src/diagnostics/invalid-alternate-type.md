This diagnostic is issued when `@alternateType` is applied to a scalar source type with a non-scalar alternate type.

To fix this issue, use a scalar alternate type when the source is a scalar, or apply `@alternateType` to a non-scalar source when replacing it with a non-scalar shape.

### Example

Instead of replacing a scalar with a model:

```typespec
using Azure.ClientGenerator.Core;

scalar storageDateTime extends utcDateTime;
model DateWrapper {
  value: string;
}
@@alternateType(storageDateTime, DateWrapper);
```

Use another scalar as the alternate type:

```typespec
scalar clientDateTime extends string;
@@alternateType(storageDateTime, clientDateTime);
```
