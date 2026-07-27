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

Description must not match the name of the node it describes. Using @doc with the
same text as the property name triggers this rule.

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

- named schema targets (`model`, `scalar`, `enum`, `union`)
- model properties, including emitted path/query/header parameter names
- HTTP operations, using the emitted HTTP verb instead of the TypeSpec symbol name
- the special-case literal `description`

## Test Cases

| ID                                            | Violation | Description |
| --------------------------------------------- | --------- | ----------- |
| `description-matches-name`                    | true      | Property named `description` keeps the original repro where the literal text and node name both match. |
| `model-description-matches-model-name`        | true      | Model description matches the emitted schema name after normalization. |
| `property-description-matches-property-name`  | true      | Regular model property description matches the property name. |
| `parameter-description-matches-emitted-name`  | true      | Resource path parameter description matches its emitted OpenAPI parameter name, not the TypeSpec source identifier. |
| `operation-description-matches-http-verb`     | true      | Resource operation description matches the emitted HTTP verb. |
| `literal-description`                         | true      | The special-case literal `description` still violates when the node name differs. |
| `parameter-description-matches-source-name-only` | false  | Path parameter description matches the TypeSpec property name but not the emitted OpenAPI parameter name. |
| `operation-description-matches-typespec-name-only` | false | Resource operation description matches the TypeSpec operation name but not the emitted HTTP verb. |
| `descriptive-docs`                            | false     | Comparable descriptions stay descriptive and avoid node-name echoes. |
