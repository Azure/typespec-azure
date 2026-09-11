---
validatorRuleId: XmsExamplesRequired
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/xms-examples-required
---

# XmsExamplesRequired

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Operations should provide x-ms-examples. TypeSpec does not emit x-ms-examples
by default, which triggers this rule.

## Source-of-truth notes

- Upstream defines `XmsExamplesRequired` in the shared `az-common` Spectral
  ruleset over `get`, `put`, `post`, `patch`, `delete`, `options`, and `head`
  operations.
- The shipped implementation only checks whether `x-ms-examples` is present.
  Any defined value passes; because of the current implementation, even an empty
  object is treated as compliant.
- The upstream unit tests only cover the missing-vs-present branches, so the
  local suite includes an explicit empty-object control to match the shipped
  validator behavior faithfully.
- TypeSpec can emit the extension from `@extension("x-ms-examples", ...)` or
  `@Autorest.example(...)`. The latter is important because the autorest emitter
  writes `x-ms-examples` from that decorator as `$ref` entries.
- Canonical TypeSpec authoring normally relies on adjacent example files with
  `operationId` and `title`, which the autorest emitter loads from `examples-dir`.
  A synchronous linter rule cannot enumerate those external files, so this rule
  only mirrors authorable in-program evidence of emitted examples.
- There is no existing local or template lint that requires every operation to
  have examples.
- The prior baseline gap only carried project-default noise
  (`auth-required`, `operation-missing-api-version`, and
  `arm-resource-operation`), with no `#suppress` directives or prerequisite
  diagnostics blocking the violating shape.

## Semantic coverage notes

This is a **true gap** locally, so the repository now adds a native lint that
mirrors the shipped validator behavior for authorable TypeSpec:

- missing `x-ms-examples` on an applicable operation => violation
- populated `x-ms-examples` => compliant
- empty `x-ms-examples` object => compliant under current upstream behavior
- `@Autorest.example(...)` entries => compliant because they emit
  `x-ms-examples` `$ref` values

## Test Cases

| ID                     | Violation | Description                                          |
| ---------------------- | --------- | ---------------------------------------------------- |
| `missing-xms-examples` | true      | Operations lack x-ms-examples                        |
| `with-xms-examples`    | false     | Operation carries a populated x-ms-examples object   |
| `empty-xms-examples`   | false     | Empty x-ms-examples still passes in shipped upstream |
| `autorest-example`     | false     | Operation uses @Autorest.example to emit examples    |
