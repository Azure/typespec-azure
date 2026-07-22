This diagnostic is issued when the value passed to the `@access` decorator is not one of the allowed access levels.

To fix this issue, pass `Access.public` or `Access.internal` to `@access` and remove any other enum member or literal value.

### Example

Instead of:

```typespec
enum CustomAccess {
  private: "private",
}
@access(CustomAccess.private)
model SecretModel {}
```

Use:

```typespec
@access(Access.internal)
model SecretModel {}
```
