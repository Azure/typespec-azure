---
validatorRuleId: XMSLongRunningOperationProperty
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/xms-long-running-operation-property
coverageKind: lint
---

# XMSLongRunningOperationProperty

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Operations whose `200`, `201`, `202`, or `204` responses include `Location` or
`Azure-AsyncOperation` headers must set `x-ms-long-running-operation: true`.

## Source-of-truth notes

- Upstream registers this as ARM rule `RPC-Async-V1-15` over `put`, `patch`,
  `post`, and `delete` operations.
- The Spectral function checks response codes `200`, `201`, `202`, and `204`
  only, and it treats header names case-insensitively.
- Upstream tests cover four violating cells (PUT+201+`Azure-AsyncOperation`,
  PATCH+202+`Location`, POST+200+`Location`, DELETE+202+`Azure-AsyncOperation`)
  plus compliant cases where `x-ms-long-running-operation: true` is already set
  or no qualifying header is present.

## Authorability notes

- Clean ARM authoring can reproduce this validator rule with custom POST actions:
  `missing-lro-extension` shows a `200` + `Location` response, and
  `missing-azure-asyncoperation-header` shows a `204` +
  `Azure-AsyncOperation` response, both without any TypeSpec suppressions.
- Standard ARM async templates already emit long-running metadata for the
  authorable PUT/PATCH/DELETE paths; `compliant-with-template` captures that
  clean compliant behavior.
- The local native lint treats an operation as compliant when either:
  - Azure.Core long-running metadata is present (the path used by standard ARM
    async templates), or
  - the operation explicitly sets `x-ms-long-running-operation: true`.
- Authoring an ad hoc compliant POST with an explicit
  `x-ms-long-running-operation` extension still requires
  `@azure-tools/typespec-azure-core/no-openapi` suppression, so local clean
  compliance coverage relies on template-generated operations and the
  `no-async-headers` selector-boundary control.

## Local semantic matrix

| Upstream semantic cell | Local coverage |
| --- | --- |
| Qualifying `Location` header without `x-ms-long-running-operation` | `missing-lro-extension` |
| Qualifying `Azure-AsyncOperation` header without `x-ms-long-running-operation` | `missing-azure-asyncoperation-header` |
| No qualifying header, so rule stays silent | `no-async-headers` |
| Template-generated ARM async PUT/PATCH/DELETE already carry long-running metadata | `compliant-with-template` |
| Explicit `x-ms-long-running-operation: true` on ad hoc POST | Covered by lint logic but not cleanly authorable without `no-openapi` suppression |
| PUT/PATCH/DELETE violating cells from upstream tests | Not separately authorable in clean ARM TypeSpec because standard templates emit the extension automatically |

## Test Cases

| ID | Violation | Description |
| --- | --- | --- |
| `compliant-with-template` | false | Standard ARM async templates emit `x-ms-long-running-operation: true` for authorable PUT/PATCH/DELETE LROs. |
| `missing-lro-extension` | true | Custom ARM POST action returns `200` with `Location` and cleanly reproduces the missing-extension violation. |
| `missing-azure-asyncoperation-header` | true | Custom ARM POST action returns `204` with `Azure-AsyncOperation` and cleanly reproduces the same violation through the alternate header path. |
| `no-async-headers` | false | Custom ARM POST action has no `Location` or `Azure-AsyncOperation` header, so the rule should stay silent. |
