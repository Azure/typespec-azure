---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/azure-http-specs"
---

Add enum-based known Azure OAuth resources, defaults, optional cloud endpoint bindings, and named challenge-contract metadata. Use enum-member references for profile kinds, default audiences, and environment audiences. Project the same service facts through TCGC for every language while leaving native audience APIs and input compatibility to emitters, and reject conflicting Azure authentication settings when merging services. Allow authentication resource catalogs in the no-enum rule, and add shared authentication Spector scenarios without inferring service endpoints from audience resources.
