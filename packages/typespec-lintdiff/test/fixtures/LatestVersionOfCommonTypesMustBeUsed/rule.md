---
validatorRuleId: LatestVersionOfCommonTypesMustBeUsed
engine: spectral
tspLints:
- 'tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used'
coverageKind: lint
---

# LatestVersionOfCommonTypesMustBeUsed

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Common-types references must use the latest version available.

The local ARM TypeSpec lint checks the effective `@armCommonTypesVersion`
selection on the service namespace or on each service version enum member and
warns when it is older than the latest version exposed by
`Azure.ResourceManager.CommonTypes.Versions`.

## Authorability Notes

The upstream validator includes a "no common-types ref is present" sanity case.
That cell is not authorable for ARM services in this repo because the ARM
TypeSpec emitter always introduces common-types references such as
`ApiVersionParameter` and `ErrorResponse`.

## Test Cases

| ID                                    | Violation | Description |
| ------------------------------------- | --------- | ----------- |
| `older-common-types`                  | Yes       | Versioned ARM service inherits `CommonTypes.Versions.v3` from the namespace. |
| `latest-common-types`                 | No        | Versioned ARM service uses the latest namespace-level common-types version. |
| `version-override-older-common-types` | Yes       | A version enum member overrides a latest namespace setting back to `v3`. |
| `version-override-latest-common-types` | No       | A version enum member overrides an older namespace setting up to the latest version. |
