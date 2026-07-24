This diagnostic is issued when `@clientNamespace` is given an empty or whitespace-only value.

## Impact

- **Area:** SDK namespace customization. Generation continues, but the empty `@clientNamespace` override cannot place generated declarations in a custom namespace.
- **Not affected:** Model names, operation routes, and payload serialization are unchanged.

## ❌ Incorrect Usage

```typespec
@clientNamespace(" ") // client namespace is empty/whitespace
model Widget {}
```

## Diagnostic Message

TCGC reports:

```text
Cannot pass an empty value to the @clientNamespace decorator
```

## ✅ How to Fix

Provide a non-empty namespace string or remove `@clientNamespace`.

```typespec
@clientNamespace("Contoso.Widgets")
model Widget {}
```

## Suppression

This diagnostic should not be suppressed. Give `@clientNamespace` a non-empty value, or remove the decorator.
