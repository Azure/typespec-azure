---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `@nextLinkVerb` decorator to specify HTTP verb for next page calls in paging operations. The decorator accepts "POST" or "GET" and defaults to "GET" when not specified. The `nextLinkVerb` field in `SdkPagingServiceMetadata` stores the HTTP verb as a string.
