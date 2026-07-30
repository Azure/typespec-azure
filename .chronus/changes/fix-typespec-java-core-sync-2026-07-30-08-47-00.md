---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Sync core to microsoft/typespec commit `38de4f58`. Includes fixes: exclude hidden maxpagesize param from generated sample (core [#11436](https://github.com/microsoft/typespec/pull/11436)), avoid credential phrase in random mock map key (core [#11435](https://github.com/microsoft/typespec/pull/11435)), and remove legacy AutorestSettings plus write Package api-version to CHANGELOG.md for Fluent Premium (core [#11433](https://github.com/microsoft/typespec/pull/11433)).
