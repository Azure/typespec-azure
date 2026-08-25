This diagnostic is issued when a scoped TCGC decorator receives a scope string that is empty,
whitespace-only, or otherwise malformed (e.g. an empty grouped negation `"!()"`, or an empty entry
in a comma-separated list such as `"csharp,"`).

## Impact

- **Area:** Scoped decorator resolution. The malformed scope value cannot be parsed into a set of
  target languages, so the decorator is not applied at all until the scope value is fixed.
- **Not affected:** Other decorators applied to the same target are unaffected.

## ❌ Incorrect Usage

```typespec
@clientName("RenamedFunc", "!()")
op myOperation(): void;
```

```typespec
@clientName("RenamedFunc", "csharp,")
op myOperation(): void;
```

## Diagnostic Message

TCGC reports:

```text
@clientName received an invalid scope value: "!()". Scope must be a non-empty language identifier, a comma-separated list (e.g. "python, java"), or a negation (e.g. "!csharp" or "!(java, python)").
```

## ✅ How to Fix

Use a well-formed scope value: a single language identifier, a comma-separated list of
identifiers, or a negation of one or more identifiers.

```typespec
@clientName("RenamedFunc", "csharp")
op myOperation(): void;
```
