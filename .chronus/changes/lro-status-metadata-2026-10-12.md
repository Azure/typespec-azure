---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add the scoped, property-level `@lroStatusMetadata` decorator with exact typed SDK metadata for auxiliary LRO status-monitor values and a latest-response lifecycle contract for poller or operation state, including failure and cancellation.

Multiple declarations on one property may use disjoint emitter scopes; overlapping scopes are diagnosed once at declaration time.

Access overrides now run after legacy hierarchy reconciliation and status metadata graph promotion, so overrides also apply to types materialized by those steps. This changes the processing order for all TCGC models, not only LROs.
