---
validatorRuleId: LroPostMustNotUseOriginalUriAsFinalState
engine: spectral
tspLints: []
coverageKind: blocked
---

# LroPostMustNotUseOriginalUriAsFinalState

**Severity:** error

**Applies to:** Resource Manager (ARM)

Treat this case as **blocked / suppression-dependent** locally. Reproducing the
validator violation requires raw OpenAPI `x-ms-long-running-operation-options`
metadata plus `no-openapi` and `arm-post-operation-response-codes`
suppressions, so the sad path is not cleanly authorable through standard ARM
templates.
