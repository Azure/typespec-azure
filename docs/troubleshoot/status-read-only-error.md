---
title: "`ProvisioningStateMustBeReadOnly` lintdiff violation in TypeSpec for ARM Service"
---

When trying to check in an ARM specification to the `azure-rest-api-specs` repository, your specification
shows violations of the `ProvisioningStateMustBeReadOnly` lintdiff check.

## Symptoms

In the `Swagger LintDiff` or `Swagger(RPaaS) LintDiff` checks, your specification shows one or more
violations of the `ProvisioningStateMustBeReadOnly` lintdiff check.

## Cause

The LintDiff swagger scripts use an old validation mechanism that does not detect `readOnly` properties, but requires the
type schema referenced by the properties to be `readOnly` instead.

## Workaround

Until this validation is fixed, you can configure the `@azure-tools/typespec-autorest` emitter in `tspConfig.yaml`
to always output any `ProvisioningState` schema as readOnly, using the `read-only-status-schema` option. This
resolves the LintDiff violation. Note that if you use the scaffolding template for `ARM`, this configuration is
enabled automatically.

```yml
emit:
  - "@azure-tools/typespec-autorest"
options:
  "@azure-tools/typespec-autorest":
    use-read-only-status-schema: true
```
