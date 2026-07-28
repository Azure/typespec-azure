This diagnostic is issued when `@clientName` is given an empty or whitespace-only value.

## Impact

- **Area:** SDK naming customization. Generation continues, but the empty `@clientName` override is ignored and the default generated name is used.
- **Not affected:** The target declaration's TypeSpec name and wire representation are unchanged.

## ❌ Incorrect Usage

```typespec
@clientName(" ") // client name is empty/whitespace
model Widget {}
```

## Diagnostic Message

TCGC reports:

```text
Cannot pass an empty value to the @clientName decorator
```

## ✅ How to Fix

Provide a non-empty name to `@clientName` or remove the decorator.

```typespec
@clientName("WidgetClient")
model Widget {}
```

## Suppression

This diagnostic should not be suppressed. Give `@clientName` a non-empty name, or remove the decorator.
