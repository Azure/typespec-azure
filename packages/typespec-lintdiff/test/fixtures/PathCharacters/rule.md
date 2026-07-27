---
validatorRuleId: PathCharacters
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/path-characters
---

# PathCharacters

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Paths should contain only recommended characters (0-9, A-Z, a-z, -, ., _, ~, :).

## Semantic coverage notes

The authorable semantic matrix covered locally is:

- final-segment literal containing `@` => invalid
- final-segment literal containing `[]` => invalid
- colon in a non-final literal segment => invalid
- `{param}:suffix` in a non-final segment => invalid
- recommended alphanumeric and `.-_~` path characters => valid
- colon in the final literal segment => valid
- `{param}:suffix` in the final segment => valid

Authorability note:

- The upstream compliant example that uses arbitrary characters inside `{...}` is not directly authorable in TypeSpec because route placeholders must use valid path parameter names. The local compliant fixture covers the same final-segment `{param}:suffix` shape with an authorable parameter name.

## Test Cases

| ID                                   | Violation | Description                                           |
| ------------------------------------ | --------- | ----------------------------------------------------- |
| `non-recommended-chars`              | true      | Final segment uses `@`, which is not recommended      |
| `square-brackets-in-final-segment`   | true      | Final segment uses `[]`, which is not recommended     |
| `colon-in-nonfinal-literal-segment`  | true      | A non-final literal segment contains `:`              |
| `parameter-suffix-in-nonfinal-segment` | true    | A non-final `{param}:suffix` segment is used          |
| `recommended-characters-only`        | false     | Path uses only recommended characters                 |
| `colon-in-final-literal-segment`     | false     | The final literal segment contains `:`                |
| `parameter-suffix-in-final-segment`  | false     | The final segment uses an authorable `{param}:suffix` |
