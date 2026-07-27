---
validatorRuleId: PutInOperationName
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/put-in-operation-name
---

# PutInOperationName

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

A PUT operation's `operationId` should use the method name `Create`.
Standard ARM resource templates normally generate compliant `operationId`
values, but this legacy test intentionally overrides the value to provoke the
validator rule.

## Test Cases

| ID                        | Violation | Description                               |
| ------------------------- | --------- | ----------------------------------------- |
| `compliant-with-template` | true      | Manual `operationId` uses `Set` instead of `Create` |
