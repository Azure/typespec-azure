This diagnostic is issued when `@clientName` is given an empty or whitespace-only value.

To fix this issue, provide a non-empty name to `@clientName` or remove the decorator.

### Example

```typespec
@clientName(" ")
model Widget {}
```

The `@clientName` value is whitespace only; use a non-empty value such as `@clientName("WidgetDetails")`.
