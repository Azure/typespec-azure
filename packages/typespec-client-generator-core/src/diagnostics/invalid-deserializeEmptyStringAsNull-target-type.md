This diagnostic is issued when `@deserializeEmptyStringAsNull` is applied to a property whose type is not `string` and is not a scalar derived from `string`.

To fix this issue, apply the decorator only to a `string` property or a property whose scalar type ultimately extends `string`.

### Example

```typespec
model Widget {
  @deserializeEmptyStringAsNull
  count: int32;
}
```

`count` is not string-like; apply the decorator to a `string` property or to a scalar derived from `string`.
