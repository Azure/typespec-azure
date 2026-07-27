---
validatorRuleId: PreviewVersionOverOneYear
engine: native
tspLints:
  - tsp-lintdiff-local-linter/preview-version-over-one-year
coverageKind: lint
---

# PreviewVersionOverOneYear

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Preview API versions older than one year should be moved to GA or retired.

## Semantic coverage notes

The upstream validator inspects `info.version` and warns when it contains a
`YYYY-MM-DD-preview` date that is over one year old.

The local lint checks ARM service version enum members and reports outdated
preview values directly on the enum member that drives the emitted API version.

## Authorability Notes

Malformed preview version strings are already covered by
`@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format`,
so this rule only covers clean `YYYY-MM-DD-preview` inputs.

The exact one-year cutoff is time-dependent, so the compliance fixture uses a
clearly future preview version to keep the matrix stable.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `old-preview-version` | yes | Preview API version is clearly older than one year |
| `future-preview-version` | no | Future-dated preview version stays inside the one-year window |
| `old-ga-version` | no | Old GA version is out of scope because it is not a preview |
