---
validatorRuleId: PageableOperation
engine: native
tspLints: []
---

# PageableOperation

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Operations returning collections with value/nextLink properties should have
x-ms-pageable. TypeSpec ARM list templates automatically produce pageable
operations.

## TypeSpec source notes

Upstream `azure-openapi-validator` covers a simple two-case matrix for this
rule:

- a plain OpenAPI GET returning an object with an array property and no
  `x-ms-pageable` => warning
- the same shape with `x-ms-pageable` present => valid

The previous local `missing-xms-pageable` repro was not a trustworthy ARM
migration fixture: it was a hand-written non-ARM GET, validated under an
inferred data-plane ruleset, and it already triggered unrelated TypeSpec
warnings such as `@azure-tools/typespec-azure-core/use-standard-operations`.

For ARM authoring, the repository-native control is the standard
`Azure.ResourceManager` list operation templates. Those templates emit the
required `x-ms-pageable` extension automatically, so the authorable local
coverage is the compliant template path rather than the raw OpenAPI sad path.
Treat this rule as **template-enforced** in the local migration inventory.

## Test Cases

| ID                       | Violation | Description                                             |
| ------------------------ | --------- | ------------------------------------------------------- |
| `compliant-with-template` | false    | ARM list templates produce correct `x-ms-pageable`      |
