---
validatorRuleId: GuidUsage
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/guid-usage
coverageKind: lint
---

# GuidUsage

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

**Source:** [Azure/azure-openapi-validator `GuidUsage`](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/az-arm.ts#L1227-L1237)

## Description

Properties should not use `format: uuid`. GUIDs are not recommended for Azure resource
properties as they are difficult to work with for customers.

## Semantic coverage notes

The upstream ARM Spectral rule uses an unresolved JSONPath query and flags every emitted
`format: uuid` occurrence, including named definitions, parameters, response bodies, and response
headers. The local native lint covers the authorable TypeSpec surfaces that produce those UUID
schemas:

- named model properties typed as `uuid`, including properties on unreferenced models because
  TypeSpec still emits those definitions
- string model properties explicitly decorated with `@format("uuid")`
- operation parameters typed as `uuid`
- template-generated operation parameters whose authored instantiation selects `uuid`
- direct request bodies typed as `uuid`
- direct success response bodies typed as `uuid`
- custom scalars and array containers that eventually emit `format: uuid`

The local rule resolves HTTP services with `getAllHttpServices`, traverses request parameters,
request bodies, response bodies, and response headers, and deduplicates diagnostics by authored
TypeSpec target. It also visits named model properties because the OpenAPI emitter includes
unreferenced named definitions. Imported library-owned UUIDs and client-only customization declarations outside the ARM provider
namespace are not treated as author-authored wire targets; direct scalar payloads fall back to the
authored operation as their diagnostic target.

## Test Cases

| ID                               | Violation | Description                                                                       |
| -------------------------------- | --------- | --------------------------------------------------------------------------------- |
| `uuid-property`                  | yes       | Resource property uses `uuid` directly                                            |
| `uuid-query-parameter`           | yes       | ARM action query parameter uses `uuid`                                            |
| `uuid-template-parameter`        | yes       | Resource name template generates a UUID path parameter                            |
| `uuid-template-format-parameter` | yes       | Resource name template parameter has an explicit UUID format                      |
| `uuid-body`                      | yes       | ARM action request body is typed as `uuid`                                        |
| `uuid-response`                  | yes       | ARM action returns a direct `uuid` payload                                        |
| `uuid-custom-scalar`             | yes       | Property uses a custom scalar that extends `uuid`                                 |
| `uuid-format-property`           | yes       | String property explicitly uses `@format("uuid")`                                 |
| `uuid-array-property`            | yes       | Resource property uses an array of `uuid` values                                  |
| `non-uuid-shapes`                | no        | Comparable strings and client-only UUID models stay compliant                     |
| `unreachable-uuid-property`      | yes       | UUID on an unreferenced named model is flagged because the model is still emitted |
