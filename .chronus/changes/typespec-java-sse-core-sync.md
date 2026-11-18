---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Update the Java generator to TypeSpec core commit `4a6bebe511` to support named JSON server-sent events (`SSEStream`) in data-plane convenience APIs ([microsoft/typespec#12312](https://github.com/microsoft/typespec/pull/12312)), initialize routing fields for retrieved create-only ARM resources ([microsoft/typespec#12593](https://github.com/microsoft/typespec/pull/12593)), and log generated `XmlSerializer` exceptions through `ClientLogger` ([microsoft/typespec#12598](https://github.com/microsoft/typespec/pull/12598)).
