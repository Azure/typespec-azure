SDK method names should not repeat their owning subclient name. The subclient already provides that context: prefer `client.widgets.get()` to `client.widgets.getWidget()`.

This rule checks the common SDK names of methods and their immediate owning subclient, for both ARM and data-plane services. It includes names set with `@clientName`, `@client`, and `@clientLocation`. Root clients are not checked. Language-specific name overrides do not change the common-name policy.

The comparison is case-sensitive and checks for the subclient name anywhere in the method name. A final lowercase `s` in the subclient name is optional: both `listPath` and `listPaths` repeat `Paths`. Other plural forms are not inferred. Names are literal text, not regular expressions.

## ❌ Incorrect

### ARM

Given a `Widget` resource, the standard ARM read operation repeats the subclient name:

```tsp
@armResourceOperations
interface Widgets {
  getWidget is ArmResourceRead<Widget>;
}
```

### Data-plane

Given a `Widget` resource and an `Operations` alias for `Azure.Core.ResourceOperations`, the same repetition occurs with a standard data-plane read operation:

```tsp
interface Widgets {
  getWidget is Operations.ResourceRead<Widget>;
}
```

## ✅ Correct

### ARM

Remove the repeated subclient name from the method:

```tsp
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

### Data-plane

```tsp
interface Widgets {
  get is Operations.ResourceRead<Widget>;
}
```

## Compatibility

Renaming a published SDK method can break callers. For a shipped method that cannot be renamed, document the compatibility reason in a suppression on the operation:

```tsp
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-client-generator-core/no-repeated-client-name" "Preserve the shipped SDK method name."
  getWidget is ArmResourceRead<Widget>;
}
```

## LintDiff Equivalent

This rule addresses the SDK naming intent of [`OperationIdNounVerb`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/operation-id-noun-verb.md). It checks common SDK names and actual client ownership, not serialized operation IDs. It treats names as literal text rather than regular expressions. These intentional boundaries can produce different findings from the Swagger validator.
