---
validatorRuleId: OperationIdNounVerb
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/operation-id-noun-verb
tspRuleset: none
---

# OperationIdNounVerb

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

OperationId should follow the Noun_Verb convention. The noun should not appear
after the underscore. Using @operationId with the noun repeated in the verb
part triggers this rule.

## Source-of-truth notes

- Upstream documentation applies this rule to both ARM and data-plane specs and
  requires `operationId` values to use `Noun_Verb`.
- The upstream Spectral function ignores empty, non-string, and no-underscore
  values.
- When an underscore is present, the implementation splits on the first
  underscore and checks whether the verb still contains the noun. A trailing
  `s` on the noun is treated as optional, so `Widgets_GetWidget` is also
  considered invalid.
- Upstream unit tests cover one invalid case (`Paths_listPath`) and one valid
  case (`Paths_list`).

## Local migration outcome

The local outcome is now **directly covered by a local TypeSpec lint**.

The repaired fixtures no longer depend on `@operationId(...)` or any
`#suppress` directives. Instead, they rely on authorable TypeSpec operation
names that emit the same `Noun_Verb` shapes the upstream Spectral rule inspects:

- `Paths_ListPaths` => invalid
- `Paths_ListPath` => invalid
- `Paths_List` => valid
- `GetWidget` (no underscore) => valid and ignored

That evidence supports a native local lint that inspects the resolved emitted
operationId and reproduces the upstream noun-repetition check directly. The
fixture uses `tspRuleset: none` so validation isolates the local lint signal
instead of depending on broader Azure.Core naming guidance.

## Semantic coverage notes

The local suite now covers the authorable branches that matter for migration:

- repeated plural noun in the verb => invalid
- singularized form of a plural noun in the verb => invalid
- `Noun_Verb` without noun repetition => valid
- no underscore => ignored / valid

The remaining upstream ignored branches are not especially useful as local
TypeSpec fixtures: `@operationId` already requires a string literal, and the
no-underscore path overlaps separate operationId-format rules.

## Test Cases

| ID                          | Violation | Description |
| --------------------------- | --------- | ----------- |
| `noun-in-verb`              | true      | OperationId repeats the full plural noun after the underscore |
| `singularized-noun-in-verb` | true      | OperationId repeats the noun in singularized form after the underscore |
| `noun-not-in-verb`          | false     | Emitted `Noun_Verb` operationId stays compliant when the verb omits the noun |
| `no-underscore`             | false     | OperationId without an underscore is ignored, matching upstream behavior |
