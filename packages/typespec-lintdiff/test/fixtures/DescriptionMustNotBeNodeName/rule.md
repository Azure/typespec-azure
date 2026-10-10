---
validatorRuleId: DescriptionMustNotBeNodeName
engine: native
tspLints:
  - tsp-lintdiff-local-linter/description-must-not-be-node-name
coverageKind: lint
---

# DescriptionMustNotBeNodeName

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Documentation should explain a declaration's meaning rather than repeat its
name. The rule checks explicit `@doc` text and doc comments, ignoring surrounding
whitespace, periods, and case. The placeholder text `description` is also
uninformative.

For example, `@doc("Ready") Ready` does not explain an enum member, whereas
`@doc("The widget is ready for use.") Ready` does. Missing or empty documentation
is outside this rule; use `documentation-required` for missing documentation.

## Native rule contract

- **Concept:** explicit documentation quality, not predicted emitted schemas.
- **Targets:** named models, scalars, enums, unions, enum members, union variants,
  properties (including keys), and operations. HTTP parameters use the supported
  path/query/header wire-name metadata. Operations compare an explicitly declared
  HTTP verb; without a verb only the placeholder check applies.
- **Union variants:** compare a string variant name, or an unnamed string literal's
  value. Other unnamed variants have only the placeholder check.
- **Exemptions:** missing, empty, or period-only text, anonymous type names, and
  HTTP status-code properties. Keys are not exempt from documentation quality.
- **Diagnostic:** one warning per offending semantic target, located on the
  declaration. Standard compiler traversal is used; enum members are enumerated
  from their enum because the installed walker does not dispatch member events.
- **APIs/prior art:** compiler `getDoc`, native names, and HTTP parameter/verb
  metadata; official `documentation-required` demonstrates enum member iteration
  but checks missing text only. No emitter, OpenAPI, or SDK dependency is used.
- **Ownership:** ARM catalog audience, without a redundant provider guard. The
  concept can be implemented in Azure Core; no ARM dependency is needed.
- **Tests:** native predicate tests cover all target kinds, normalization, literal
  placeholder, wire-name controls, key properties, and exact diagnostic locations.

## Intentional migration differences

The native rule does not predict visibility-suffixed or friendly schema names,
SDK name overrides, generated response descriptions, or external referenced
Swagger declarations. It checks explicit source documentation, not synthesized
text. Named union variants are checked directly even when their descriptions are
not emitted as enum metadata. These are documented native-contract differences,
not a claim of universal executable Swagger parity.

## Native and emitted shape matrix

All native test rows compile with compiler/HTTP libraries and only this rule
enabled. Enum syntax is compiler-supported, although Azure's separate `no-enum`
rule recommends extensible unions. The comparison fixtures additionally exercise
real emission; emitted field presence is research, not an implementation input.

| Authored shape                                                                     | Support                                | Native check                                           | Description field and Swagger result                                                                          | Evidence                                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Named model, scalar, enum, or union with matching documentation                    | Supported native types                 | Compare the native type name                           | Type schema description is populated by `getDoc`; ordinary unsuffixed schema names match                      | Native target-kind tests; model-name comparison fixture                    |
| Documented enum member or named string union variant                               | Supported native types                 | Compare the member/variant name, not its literal value | `getSchemaForEnum` / `getSchemaForUnionEnum` emit explicit text in `x-ms-enum.values`; matching names violate | `member-and-key-documentation` emits matching `Ready` and `Active` entries |
| Unnamed documented string union variant                                            | Supported native type                  | Compare the string literal value                       | Union enum emission uses the literal value when there is no string variant name                               | Native unnamed-string test; `getSchemaForUnionEnum` value-name fallback    |
| Ordinary property, including a non-HTTP key                                        | Supported native model property        | Compare the property name                              | Matching property descriptions violate                                                                        | `member-and-key-documentation` emits `Widget.properties.id.description`    |
| Path/query/header parameter with an explicit wire-name override                    | Supported HTTP customization           | Compare supported HTTP name metadata                   | Matching parameter descriptions violate; source-name-only text does not                                       | Parameter comparison fixtures and three native wire-name tests             |
| Explicit HTTP operation verb                                                       | Supported HTTP operation               | Compare verb metadata                                  | `put` operation description `put.` violates, while `createOrUpdate.` does not                                 | Both operation comparison fixtures                                         |
| Status-code property                                                               | Supported HTTP metadata                | Exempt                                                 | Status metadata is not a documented payload property                                                          | Native status-code exclusion test                                          |
| Missing, empty, or period-only text                                                | Supported authoring                    | No diagnostic                                          | No description or normalized empty text does not satisfy the validator predicate                              | Native compliant tests                                                     |
| Namespace-qualified or visibility-renamed schema                                   | Supported source type                  | Compare native name                                    | Description may differ from the generated schema key; native warning can be intentional extra coverage        | Fleet's `ClusterSelector` is emitted as `Placement.V1.ClusterSelector`     |
| Generated response text, external Swagger references, or SDK/schema-name overrides | Outside the native comparison boundary | Do not synthesize or resolve output descriptions       | Swagger can select output nodes with no equivalent editable native documentation target                       | Emitter research only; not claimed as native parity                        |

The corpus is observational evidence for its represented shapes, not universal
equivalence proof. See `migration.md` for population alignment and remaining
comparison limitations.

## Source-of-truth notes

- The upstream validator normalizes descriptions by trimming whitespace, removing
  periods, and comparing case-insensitively.
- It reports three authorable branches:
  - objects with an explicit `name` field, such as parameters
  - objects whose OpenAPI node key is the effective name, such as schemas,
    properties, and HTTP verbs
  - the literal text `description`, even when it does not match the node name

## Authorability notes

- Non-string OpenAPI descriptions are not authorable from TypeSpec `@doc`, so
  that upstream guard is intentionally untested here.
- Generated response-description nodes are not directly controllable through a
  dedicated TypeSpec `@doc` target in this harness, so the local suite focuses on
  schemas, properties, parameters, and HTTP operations.
- The parameter rename cases use a small generic HTTP service instead of ARM
  resource templates so the emitted parameter name can differ cleanly from the
  TypeSpec source identifier without unrelated ARM scaffolding.

## Semantic coverage notes

The local TypeSpec lint mirrors the upstream normalization and covers:

- named type targets (`model`, `scalar`, `enum`, `union`) and their enum members
  and union variants
- model properties, including emitted path/query/header parameter names
- HTTP operations, using the emitted HTTP verb instead of the TypeSpec symbol name
- the special-case literal `description`

## Test Cases

| ID                                                 | Violation | Description                                                                                                         |
| -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| `description-matches-name`                         | true      | Property named `description` keeps the original repro where the literal text and node name both match.              |
| `model-description-matches-model-name`             | true      | Model description matches the emitted schema name after normalization.                                              |
| `property-description-matches-property-name`       | true      | Regular model property description matches the property name.                                                       |
| `parameter-description-matches-emitted-name`       | true      | Resource path parameter description matches its emitted OpenAPI parameter name, not the TypeSpec source identifier. |
| `operation-description-matches-http-verb`          | true      | Resource operation description matches the emitted HTTP verb.                                                       |
| `literal-description`                              | true      | The special-case literal `description` still violates when the node name differs.                                   |
| `parameter-description-matches-source-name-only`   | false     | Path parameter description matches the TypeSpec property name but not the emitted OpenAPI parameter name.           |
| `operation-description-matches-typespec-name-only` | false     | Resource operation description matches the TypeSpec operation name but not the emitted HTTP verb.                   |
| `descriptive-docs`                                 | false     | Comparable descriptions stay descriptive and avoid node-name echoes.                                                |
| `member-and-key-documentation`                     | true      | Explicit enum member, union variant, and keyed payload property documentation repeats the native name.              |
