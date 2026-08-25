---
validatorRuleId: NonApplicationJsonType
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/non-application-json-type
---

# NonApplicationJsonType

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Original Swagger rule:** [`NonApplicationJsonType`](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/az-arm.ts)

Operations must only consume/produce application/json content type.

## Semantic coverage notes

The authorable matrix in this repo includes:

- ARM action response with explicit `application/octet-stream` => invalid
- ARM action response with an implicit scalar `text/plain` content type => invalid
- ARM action request with explicit `text/plain` => invalid
- ARM PATCH action request with explicit `application/merge-patch+json` => invalid
- Standard JSON-only request/response shapes => valid

Unrepresentable or blocked upstream shapes:

- Root-level `consumes` / `produces` entries are emitter-controlled in current TypeSpec OpenAPI2 output, so the upstream global-array regressions cannot be authored directly here.
- `multipart/form-data` request bodies are suppression-dependent because current TypeSpec and autorest validation emit unrelated diagnostics first.

| ID                               | Violation | Description                                                 |
| -------------------------------- | --------- | ----------------------------------------------------------- |
| `json-only-content-type`         | false     | ARM action uses only `application/json` content types       |
| `non-json-content-type`          | true      | ARM action produces `application/octet-stream`              |
| `scalar-response-content-type`   | true      | ARM action returns a scalar body that produces `text/plain` |
| `non-json-request-content-type`  | true      | ARM action consumes `text/plain`                            |
| `patch-merge-patch-content-type` | true      | ARM PATCH action consumes `application/merge-patch+json`    |
