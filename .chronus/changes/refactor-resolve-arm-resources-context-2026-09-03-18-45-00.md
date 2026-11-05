---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add selected-version and multi-service views plus dependency-neutral logical name customization to `resolveArmResources`. Callers can select independent namespace/version references for services that share an ARM provider string and receive one combined provider result. Deferred naming formulas apply consumer model names to every model-derived part of a resource name while preserving explicit names and structural grouping; complete resource names can be overridden per occurrence, synthetic resources can be identified by default name or ARM instance path, and returned resource kinds are presented consistently as `Tracked` or `Proxy`. The existing no-options call continues to return the multi-version declaration view, with an ARM emitter how-to covering resource extraction, service/version discovery, selected versions, and TCGC client naming.
