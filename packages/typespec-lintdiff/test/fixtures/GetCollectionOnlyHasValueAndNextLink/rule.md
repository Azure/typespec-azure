---
validatorRuleId: GetCollectionOnlyHasValueAndNextLink
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/get-collection-only-has-value-and-next-link
---

# GetCollectionOnlyHasValueAndNextLink

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Collection GET responses must only have `value` and `nextLink` properties. Extra properties
beyond these two are not allowed in the collection response model.

## Current outcome

Classification: true gap.

The original template-based fixture was stale: current ARM template output no longer reproduced
the upstream validator. A corrected raw ARM GET fixture that emits a static collection path now
reproduces the validator cleanly with no prerequisite TypeSpec diagnostics, so native lint
coverage is warranted.

## Semantic coverage notes

- upstream scope is ARM GET collection paths whose emitted path does not end in `}`, `operations`,
  or `default`
- the local lint mirrors the upstream provider-tail path heuristic against ARM GET operations and
  requires object 200-response models to declare only `value` and `nextLink`
- direct array response schemas do not expose `schema.properties` in Swagger and are skipped
- property-less object response schemas, such as direct `Record<T>` bodies, do not expose
  `schema.properties` in Swagger and are skipped
- file and multipart response bodies emit Swagger `file` or `string` schemas without
  `schema.properties` and are skipped
- non-collection point GET paths with an odd provider-tail segment count are skipped even when
  their response shape would be invalid for a collection GET
- TypeSpec route query suffixes are ignored for terminal path-parameter and provider-tail path
  classification to match emitted OpenAPI paths
- paths ending with `operations` or `default` are skipped using the same string suffix test as
  Swagger, even when the suffix is not a standalone path segment
- query-bearing paths ending in `operations` or `default` before the query still run because
  Swagger applies the suffix exclusions to the raw path key
- ARM templates already tend to emit compliant list models; the clean repro comes from a manually
  routed ARM collection GET

## Test Cases

| ID                                         | Violation | Description                                                                                       |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------- |
| `extra-collection-props`                   | yes       | Raw ARM collection GET response adds an extra top-level property                                  |
| `extension-scope-value-only`               | yes       | Provider-tail collection path response declares only `value`                                      |
| `only-value-and-nextlink`                  | no        | Raw ARM collection GET response keeps only value and `nextLink`                                   |
| `array-response-body`                      | no        | Named array response body has no Swagger `schema.properties` node                                 |
| `direct-array-response-body`               | no        | Direct `T[]` response body has no Swagger `schema.properties` node                                |
| `record-response-body`                     | no        | Direct `Record<T>` response body has no Swagger `schema.properties` node                          |
| `file-response-body`                       | no        | File response body emits a Swagger `type: file` schema                                            |
| `multipart-response-body`                  | no        | Multipart response body emits a Swagger `type: string` schema                                     |
| `terminal-resource-invalid-response`       | no        | Odd provider-tail point GET with a query suffix skips an otherwise invalid response               |
| `operations-suffix-invalid-response`       | no        | Path ending in `operations` skips an otherwise invalid response                                   |
| `operations-query-suffix-invalid-response` | yes       | Raw path ending in `?disambiguation_dummy` does not match Swagger's `operations` suffix exclusion |
| `default-suffix-invalid-response`          | no        | Path ending in `default` skips an otherwise invalid response                                      |
| `default-query-suffix-invalid-response`    | yes       | Raw path ending in `?disambiguation_dummy` does not match Swagger's `default` suffix exclusion    |
