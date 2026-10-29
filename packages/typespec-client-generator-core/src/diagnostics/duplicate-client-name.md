This diagnostic is issued when two declarations have the same effective client name in the same language scope and the duplicate is an error for that scope.

Within each declared namespace, interfaces are checked together with models, enums, and unions. This declaration-level check honors `@clientName` overrides but does not account for emitter-specific suffixes such as `Operations` or `Client`.

## Impact

- **Area:** SDK symbol naming. Blocks compilation when declarations have conflicting effective client names in one language scope.
- **Not affected:** Wire names and service operation routes are unchanged.

## Decorator-applied duplicate

### ❌ Incorrect Usage

```typespec
@clientName("Widget") // duplicates the generated client name of `model Widget`
model WidgetResponse {}

model Widget {}
```

### Diagnostic Message

TCGC reports:

```text
Client name: "Widget" is duplicated in language scope: "AllScopes"
```

### ✅ How to Fix

Rename one declaration with `@clientName`, change the applicable scope, or otherwise make generated names unique.

```typespec
@clientName("WidgetResponse")
model WidgetResponse {}

model Widget {}
```

## Generated name conflict

### Diagnostic Message

TCGC reports:

```text
Client name: "Widget" is defined somewhere causing naming conflicts in language scope: "AllScopes"
```

### ✅ How to Fix

Rename one of the declarations or adjust the language scope so the generated client names no longer collide.
