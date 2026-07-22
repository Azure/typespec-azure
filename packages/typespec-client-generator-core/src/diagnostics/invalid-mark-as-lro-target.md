This diagnostic is issued when `@markAsLro` is applied to an operation that does not return a non-error model response.

To fix this issue, apply `@markAsLro` only to operations that return a model, or remove the decorator.

### Example

```typespec
@markAsLro
@post
op start(): string;
```

The operation returns `string`, not a model; return a model response or remove `@markAsLro`.
