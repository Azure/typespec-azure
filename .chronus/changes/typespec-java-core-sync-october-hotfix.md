---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Update the Java generator to TypeSpec core commit `f098e0fdd`. Includes Azure V1 continuation-token paging ([microsoft/typespec#12196](https://github.com/microsoft/typespec/pull/12196)), escaped enum values in schema Javadoc ([microsoft/typespec#12177](https://github.com/microsoft/typespec/pull/12177)), and dependency updates with version synchronization ([microsoft/typespec#12286](https://github.com/microsoft/typespec/pull/12286)). Add a local script to align test dependencies and plugins with the pinned generator.
