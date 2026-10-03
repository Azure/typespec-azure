A summary should briefly describe a declaration, while its documentation should provide
additional useful detail. This rule warns when nonempty `@summary` and documentation
from `@doc` or a doc comment contain identical text after trimming surrounding whitespace.
Comparison is case-sensitive. Missing or empty values are left to documentation-presence rules.

The rule checks namespaces, interfaces, operations, models, model properties (including operation
parameters), scalars, enums, enum members, unions, and union variants.

## Impact

- **Area:** SDK, API

Repeating documentation in the summary adds no information to generated API references and
SDK documentation. Add useful detail to the documentation or omit the redundant summary.

#### Incorrect

```tsp
@summary("List widgets")
@doc("List widgets")
op listWidgets(): string[];
```

#### Correct

```tsp
@summary("List widgets")
@doc("Returns the names of all widgets visible to the authenticated caller.")
op listWidgets(): string[];
```

Alternatively, omit the redundant summary:

```tsp
/** A widget visible to the authenticated caller. */
model Widget {
  /** The widget's display name. */
  name: string;
}
```

A concrete operation alias and its instantiated project-defined source can each receive a warning at their own source
locations. Uninstantiated templates are not visited, and diagnostics on imported library
declarations are excluded by the compiler.

## Suppression

Prefer adding useful detail or omitting the redundant summary rather than changing only
capitalization or punctuation. Suppression is acceptable when existing public documentation must
be preserved; simple declarations can otherwise omit the summary.

```tsp
#suppress "@azure-tools/typespec-azure-core/no-redundant-summary" "Preserve existing public documentation."
@summary("List widgets")
@doc("List widgets")
op listWidgets(): string[];
```

## LintDiff Equivalent

This rule is based on
[SummaryAndDescriptionMustNotBeSame](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#summaryanddescriptionmustnotbesame).
It preserves the original trimmed, case-sensitive comparison and missing/empty-value exemptions,
but intentionally extends the Swagger rule's operation-only scope to all declaration kinds listed
above. It checks TypeSpec declarations rather than emitted endpoints.
