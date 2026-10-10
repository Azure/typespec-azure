---
validatorRuleId: PostResponseCodes
engine: spectral
coverageKind: partial
tspRuleset: resource-manager
tspLints:
  - "tsp-lintdiff-local-linter/no-empty-post-response"
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
officialTspLints:
  - "@azure-tools/typespec-azure-resource-manager/no-response-body"
---

# PostResponseCodes

**RPC Code:** RPC-Async-V1-11, RPC-Async-V1-14, RPC-POST-V1-02, RPC-POST-V1-03

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Synchronous ARM resource POST actions returning 200 must return a response body.
Use a 204 response when the action completes without a payload. Response headers
are metadata, not a response body. An explicitly declared empty model payload is
still a body, but an explicit `@body` of type `void` carries no payload and must
also use 204.

The focused `no-empty-post-response` rule checks only this missing-body case.
Existing official rules continue checking status-code combinations, long-running
200 response bodies, and bodies forbidden on 202/204 responses.

## Incorrect

```tsp
@armResourceOperations
interface Employees {
  hire is ArmResourceActionSync<
    Employee,
    void,
    Response = {
      @statusCode _: 200;
    }
  >;
}
```

## Correct

```tsp
@armResourceOperations
interface Employees {
  hire is ArmResourceActionSync<Employee, void, Response = ArmNoContentResponse>;
}
```

Both snippets use an ARM `Employee` resource. The native test suite supplies the
resource and imports and checks these exact response customizations.

## Native contract and ownership

- **Intent:** resource POST 200 success responses carry payloads; empty success
  responses use 204.
- **Audience:** ARM resource lifecycle/action operations resolved by
  `getArmResources`, matching the official POST status-code rule's ownership.
- **API:** resolved `httpOperation.responses`; native `getLroMetadata` excludes
  long-running operations; compiler `isVoidType` identifies a body declaration
  without a payload. No schema emission or extension inspection.
- **Diagnostic:** one warning on the operation if any 200 response variant has
  no HTTP body. A mixed payload/metadata-only union must not throw.
- **Exemptions:** other verbs/statuses and native LROs; provider actions are
  outside this focused resource-operation contract.
- **Sibling:** `arm-post-operation-response-codes` owns status sets and async
  bodies; `no-response-body` owns 202/204 and explicitly exempts POST 200.
- **Activation:** available in the explicit lintdiff `all` comparison ruleset,
  not its `recommended` ruleset. Promotion must remain opt-in: changing the
  enabled official POST rule would silently broaden default diagnostics.

## LintDiff equivalent and intentional limits

- [Validator implementation](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/post-response-codes.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/post-response-codes.md)

The installed validator examines POST operations in `paths` and `x-ms-paths`.
Synchronous response sets must be `{200, default}` or `{204, default}`.
Async detection uses 202 or legacy LRO extensions, requires a true LRO extension,
and accepts `{202, 200, default}` or `{202, 204, default}`. It rejects every 200
without a schema (including synchronous POST), and schemas on 202/204.

The official native POST rule accepts modern initial `{202, default}` responses:
the final result is represented by native polling/final-operation metadata rather
than necessarily another initial-operation response. Exact legacy extension and
initial/final response representation parity is not this rule's contract.
Provider-action traversal remains unclassified and is not expanded here.
See [migration evidence](migration.md) for populations and remaining limitations.

## Test cases

| ID                    | Intent     | Check                                               |
| --------------------- | ---------- | --------------------------------------------------- |
| `post-extra-201`      | Violation  | Existing official status-set check                  |
| `post-empty-200`      | Violation  | Bodyless 200 through `Response` customization       |
| `post-void-200`       | Violation  | Explicit void body through `Response` customization |
| `post-body-200`       | Compliance | 200 with explicit scalar payload                    |
| `post-no-content-204` | Compliance | 204 without a payload                               |
