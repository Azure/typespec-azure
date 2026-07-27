---
validatorRuleId: OperationIdNounConflictingModelNames
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/operation-id-noun-conflicting-model-names
---

# OperationIdNounConflictingModelNames

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

The noun part of an operationId should not conflict with model names. Using
@operationId to set a noun that matches a model name triggers this rule.

## Test Cases

| ID                        | Violation | Description                                          |
| ------------------------- | --------- | ---------------------------------------------------- |
| `noun-conflicts-model`    | true      | OperationId noun matches a model definition name     |
