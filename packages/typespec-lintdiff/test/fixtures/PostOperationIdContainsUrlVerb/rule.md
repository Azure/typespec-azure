---
validatorRuleId: PostOperationIdContainsUrlVerb
engine: native
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/post-operation-id-contains-url-verb
---

# PostOperationIdContainsUrlVerb

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

A POST operation's operationId should contain the verb from the URL path.
TypeSpec ARM action operations automatically produce correct operationIds.

## Test Cases

| ID                     | Violation | Description                                               |
| ---------------------- | --------- | --------------------------------------------------------- |
| `missing-url-verb`     | true      | Manual `operationId` omits the action verb from the URL path |
