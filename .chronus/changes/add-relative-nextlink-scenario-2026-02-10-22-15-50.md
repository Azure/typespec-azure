---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Add test scenario for relative nextLink URLs in pagination. Some Azure services use relative URLs instead of absolute URLs for pagination nextLink, requiring clients to resolve them against the service endpoint.