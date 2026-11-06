---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `propertySegments` to `SdkLroStatusMetadata` so emitters can locate selected metadata values relative to `pollingInfo.responseModel`, following the existing typed segment convention. Segments preserve SDK and wire names and reference the retained property after hierarchy reconciliation.