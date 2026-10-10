Documentation should explain what a declaration means or how to use it, rather than repeat its
name. Meaningful descriptions help API users understand generated client types, parameters,
and operations.

This rule checks explicit `@doc` text and doc comments on named models, scalars, enums, unions,
enum members, union variants, properties, and operations. It ignores surrounding whitespace,
periods, and case when comparing text. The placeholder `description` also produces a warning.

HTTP path, query, and header parameters are compared with their configured wire names.
Ordinary properties are compared with their JSON encoded name, falling back to their source
name when no JSON override exists. Parameter wire names take precedence over JSON encoded names.
Multipart properties use their authored `HttpPart` name, or their source property name when
the part has no explicit name. JSON encoded names do not rename multipart parts. This includes
scalar payloads, array payloads, and repeated parts; HTTP parameter names still take precedence.
Operations are compared with their effective HTTP verb, not their operation name, including
inferred GET for operations without a body and POST for operations with a body.
Named union variants are compared with their variant name; unnamed string variants are compared
with their string value. Other unnamed variants are checked only for placeholder text.

Missing or empty documentation is outside this rule; use `documentation-required` to require
documentation. Status-code properties are exempt. Key properties are not exempt.

## Impact

- **Area:** API, SDK

Repeating names or leaving placeholder text makes API reference documentation and generated
client documentation less useful.

## Examples

These examples illustrate shared model and property documentation, applicable to both
data-plane and Resource Manager APIs.

#### Incorrect

```tsp
/** Widget */
model Widget {
  /** Name */
  name: string;
}
```

#### Correct

```tsp
/** A configurable device available in the store. */
model Widget {
  /** The display name shown to users. */
  name: string;
}
```

## Suppression

Prefer replacing repetitive or placeholder text with meaningful documentation. Suppress this
rule only when the name itself is the clearest useful description and adding prose would not
help API consumers.

## LintDiff Equivalent

This rule corresponds to
[DescriptionMustNotBeNodeName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/description-must-not-be-node-name.md).
