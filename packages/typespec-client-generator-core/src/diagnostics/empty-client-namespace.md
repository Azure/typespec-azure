This diagnostic is issued when `@clientNamespace` is given an empty or whitespace-only value.

To fix this issue, provide a non-empty namespace string or remove `@clientNamespace`.

### Example

```typespec
@clientNamespace(" ")
model Widget {}
```

The namespace value is empty; provide a namespace such as `@clientNamespace("Contoso.Widgets")`.
