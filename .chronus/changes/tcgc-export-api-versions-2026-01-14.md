---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added `apiVersions` Map to `SdkPackage.metadata` to export API versions for multiple services. The Map key is the service namespace full qualified name, and the value is the version string. The existing `apiVersion` property is now deprecated and will be removed in a future release. For single service scenarios, both properties will be populated. For multiple service scenarios, only `apiVersions` will be populated while `apiVersion` will be undefined.
