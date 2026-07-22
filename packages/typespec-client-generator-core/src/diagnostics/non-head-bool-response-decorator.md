This diagnostic is issued when `@responseAsBool` is applied to an operation that is not decorated with `@head`.

To fix this issue, add `@head` when the operation is a HEAD request, or remove `@responseAsBool`.

### Example

Instead of:

```typespec
@responseAsBool
@get
op exists(): void;
```

Use `@head` for boolean HEAD response modeling:

```typespec
@responseAsBool
@head
op exists(): void;
```
