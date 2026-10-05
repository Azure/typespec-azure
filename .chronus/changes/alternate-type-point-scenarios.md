---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Customize the existing alternate-type scenarios for C# by mapping `Geometry` to `Azure.Core.GeoJson.GeoPoint` from `Azure.Core` 1.61.0 or later instead of the invalid Feature mapping. Preserve all existing scenarios and payloads.
