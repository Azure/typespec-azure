---
validatorRuleId: UniqueXmsExample
engine: native
tspLints: []
---

# UniqueXmsExample

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

x-ms-example names must be unique. TypeSpec does not emit x-ms-examples
by default, so no duplicates are possible.

## Test Cases

| ID                          | Violation | Description                                       |
| --------------------------- | --------- | ------------------------------------------------- |
| `duplicate-example-name`    | false     | TypeSpec does not emit x-ms-examples by default   |
