---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Simplify the generated SDK `User-Agent` telemetry prefix to follow the [Azure Core telemetry policy](https://azure.github.io/azure-sdk/general_azurecore.html#telemetry-policy). The legacy internal layering tokens `azsdk-js-client` and `azsdk-js-api` are no longer emitted, so the user agent is now `[<application_id> ]azsdk-js-<package>/<version> <platform_info>`. Any caller-supplied application id is still forwarded and prepended.
