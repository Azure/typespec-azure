---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

When no server url is passed, we still set serverUrl to `{endpoint}` and make one templateArg for `endpoint`. This way, emitters can always look at a combination of serverUrl and templateArguments to get the full picture