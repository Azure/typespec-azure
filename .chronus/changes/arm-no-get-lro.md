---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
---

Add the opt-in ARM `no-get-lro` rule for effective explicit GET LRO declarations.
Legitimate polling metadata alone is compliant. The rule remains disabled in
the ARM library `all` ruleset.

Azure Core exposes `setLroDeclaration` and `isLroDeclared` for accepted,
consumer-specific operation declarations. TCGC publishes accepted
`Legacy.markAsLro` state without changing its validation, scopes or emission.
ARM queries the shared metadata without depending on TCGC.

```tsp
// Enable @azure-tools/typespec-azure-resource-manager/no-get-lro explicitly.
@armResourceOperations
interface Widgets {
  // Do not explicitly declare reads long-running.
  read is ArmResourceRead<Widget>;
}
```
