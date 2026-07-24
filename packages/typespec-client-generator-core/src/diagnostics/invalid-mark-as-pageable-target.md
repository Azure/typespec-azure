This diagnostic is issued when `@markAsPageable` is applied to an operation that does not return a model with a property decorated with `@pageItems` or named `value`.

## Impact

- **Area:** Legacy pageable SDK metadata. Generation continues with the operation treated as a regular method because TCGC cannot identify page items.
- **Not affected:** The operation's service response schema is unchanged.

## ❌ Incorrect Usage

```typespec
@markAsPageable
@get
op listWidgets(): string; // pageable marker requires a page model response
```

## Diagnostic Message

TCGC reports:

```text
@markAsPageable decorator can only be applied to operations that return a model with a property decorated with @pageItems or a property named 'value'. We will ignore this decorator.
```

## ✅ How to Fix

Apply `@markAsPageable` only to operations returning a suitable page model, or update the response model to include `@pageItems` or a `value` property.

```typespec
model Widget {
  name: string;
}

model WidgetPage {
  value: Widget[];
}

@markAsPageable
@get
op listWidgets(): WidgetPage;
```

## Suppression

This diagnostic should not be suppressed. Fix the target so it is a valid pageable operation, or remove `@markAsPageable`.
