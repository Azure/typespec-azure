This diagnostic is issued when two generated SDK declarations have the same client name in the same language scope and the duplicate is an error for that scope.

## Impact

- **Area:** SDK symbol naming. Blocks generation of two declarations with the same client name in one language scope because they would collide in the emitted API.
- **Not affected:** Wire names and service operation routes are unchanged.

### Decorator-applied duplicate

#### ❌ Incorrect Usage

```typespec
@clientName("Widget") // duplicates the generated client name of `model Widget`
model WidgetResponse {}

model Widget {}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Client name: "Widget" is duplicated in language scope: "AllScopes"
```

#### ✅ How to Fix

Rename one declaration with `@clientName`, change the applicable scope, or otherwise make generated names unique.

### Generated name conflict

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Client name: "Widget" is defined somewhere causing naming conflicts in language scope: "AllScopes"
```

#### ✅ How to Fix

Rename one of the declarations or adjust the language scope so the generated client names no longer collide.
