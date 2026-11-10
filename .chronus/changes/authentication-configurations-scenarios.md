---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Add Public and Government authentication configuration scenarios that require a local OAuth client-credentials exchange followed by a request to the paired service endpoint. Validate `grant_type`, `client_id`, `client_secret`, and cloud-specific `scope` values, and require the returned bearer token for the selected configuration.
