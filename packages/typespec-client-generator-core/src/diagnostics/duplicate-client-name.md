This diagnostic is issued when two generated SDK declarations have the same client name in the same language scope and the duplicate is an error for that scope.

## Impact

- **Area:** SDK symbol naming. Blocks generation of two declarations with the same client name in one language scope because they would collide in the emitted API.
- **Not affected:** Wire names and service operation routes are unchanged.

Models, enums, unions, interfaces, scalars and child namespaces declared in the same
namespace are compared together. Empty interfaces and namespace containers
participate too; the check does not depend on operation reachability. Nested
namespaces are checked independently rather than flattened.

The existing validator compares declaration names and `@clientName` overrides in
each applicable language scope, including common-name fallback and negated scopes.
It does not introduce friendly-name resolution, generated client-graph traversal
or comparisons between top-level types and operation names.

This is normal validation using the existing `duplicate-client-name` error, not
an optional lint rule. Disabling a linter ruleset does not disable this validation.

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

## Interface and model name conflict

### Incorrect Usage

```typespec
import "@azure-tools/typespec-client-generator-core";
using Azure.ClientGenerator.Core;

@service
namespace Example;

model Widget {}

@clientName("Widget")
interface WidgetOperations {
  read(): Widget;
}
```

The interface's client name conflicts with the model's name. The existing
diagnostic reports the original declaration and the conflicting `@clientName`
decorator in the applicable scope.

### How to Fix

Use a distinct interface client name, for example `Widgets`:

```typespec
import "@azure-tools/typespec-client-generator-core";
using Azure.ClientGenerator.Core;

@service
namespace Example;

model Widget {}

@clientName("Widgets")
interface WidgetOperations {
  read(): Widget;
}
```
