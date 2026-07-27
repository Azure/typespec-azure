---
validatorRuleId: docLinkLocale
engine: spectral
tspLints: []
---

# docLinkLocale

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Documentation links should not contain locale info like /en-us/. Using
a @doc with a URL containing locale triggers this rule.

## Test Cases

| ID                       | Violation | Description                                          |
| ------------------------ | --------- | ---------------------------------------------------- |
| `locale-in-doc-link`     | true      | Description contains a doc link with /en-us/ locale  |
