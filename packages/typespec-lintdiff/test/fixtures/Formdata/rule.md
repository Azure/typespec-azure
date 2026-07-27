---
validatorRuleId: Formdata
engine: spectral
tspLints: []
---

# Formdata

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Using formData parameters is generally unnecessary when sending a single file.
TypeSpec does not produce formData parameters for simple binary bodies.

## Test Cases

| ID                   | Violation | Description                                           |
| -------------------- | --------- | ----------------------------------------------------- |
| `formdata-parameter` | false     | TypeSpec binary body uses application/octet-stream    |
