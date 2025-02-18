---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Deprecate `__raw_paged_metadata`, `nextLinkPath` and `nextLinkOperation`  in `SdkPagingServiceMethodOptions`. Use `pagingMetadata.__raw`, `pagingMetadata.nextLinkSegments` and `pagingMetadata.nextLinkOperation` instead.