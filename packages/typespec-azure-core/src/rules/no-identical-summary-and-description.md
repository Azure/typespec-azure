An operation's summary should briefly state what it does, while its description should provide
additional useful detail. This rule warns when nonempty `@summary` and operation documentation
from `@doc` or a doc comment contain identical text after trimming surrounding whitespace.
Comparison is case-sensitive. Missing or empty values are left to documentation-presence rules.

## Impact

- **Area:** SDK, API

Repeating the summary in the description adds no information to generated API references and
SDK documentation. Explain behavior, constraints, or the returned result instead.

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

The rule checks native operation declarations rather than emitted endpoints. A concrete operation
alias and its instantiated project-defined source can each receive a warning at their own source
locations. Uninstantiated templates are not visited, and diagnostics on imported library
declarations are excluded by the compiler.

## Suppression

Prefer adding useful detail rather than changing only capitalization or punctuation. Suppress this
rule when an operation is intentionally simple and a separate description would add no useful
information, or when maintaining existing public documentation is required.

## LintDiff Equivalent

This rule corresponds to
[SummaryAndDescriptionMustNotBeSame](https://github.com/Azure/azure-openapi-validator/blob/main/docs/summary-and-description-must-not-be-same.md).
