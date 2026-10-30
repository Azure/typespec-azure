---
validatorRuleId: XMSLongRunningOperationProperty
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/xms-long-running-operation-property
coverageKind: lint
---

# XMSLongRunningOperationProperty

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

ARM PUT, PATCH, POST, and DELETE operations whose `200`, `201`, `202`, or `204`
responses include `Location` or `Azure-AsyncOperation` headers must have native
polling metadata. These headers tell clients how to poll an asynchronous operation.
Use an asynchronous ARM template and preserve its semantic polling headers.

Header names are case-insensitive. The rule reports the first qualifying header
property once per operation, in success-code order. Other verbs, other status
codes, and other headers are outside this check.

### Incorrect

This synchronous provider-action template accepts a response customization that
adds a polling URL without defining polling semantics:

```typespec
model Response {
  @statusCode statusCode: 202;
  @header("Location") location?: string;
}

@armResourceOperations
interface ProviderActions {
  start is ArmProviderActionSync<Request = void, Response = Response>;
}
```

### Correct

Use the asynchronous template so clients have a supported polling contract:

```typespec
@armResourceOperations
interface ProviderActions {
  start is ArmProviderActionAsync<Request = void, Response = void>;
}
```

Both examples use `TypeSpec.Http` and `Azure.ResourceManager` in a configured ARM
service. The native unit tests compile these exact declarations and assert one
diagnostic on `Response.location` for the incorrect example and none for the
correct example.

## Native contract and ownership

- Intended destination: `@azure-tools/typespec-azure-resource-manager`. The check
  concerns ARM HTTP responses, not SDK behavior.
- APIs: `getHttpService` exposes operations and serialized response header names;
  `getLroMetadata` determines supported polling semantics without an emitter.
- The lintdiff mixed-rule runner uses `getArmProviderNamespace` on each service
  as an isolation boundary. This is not a native semantic requirement and should
  be removed when promotion relies on the ARM ruleset audience.
- An operation visited through overlapping services is checked once. Distinct
  operations sharing a response property each receive a finding on that property.
- Sibling comparison: `lro-extension` uses the same service/HTTP metadata layer;
  the official `lro-location-header` checks missing headers, not missing metadata.

## LintDiff Equivalent

- Validator: [XMSLongRunningOperationProperty implementation](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/xms-long-running-operation-property.ts)
- Validator documentation: [xms-long-running-operation-property.md](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-long-running-operation-property.md)
- RPC guideline: `RPC-Async-V1-15`.
- The validator inspects PUT/PATCH/POST/DELETE responses `200`, `201`, `202`,
  and `204`. It reports the first case-insensitive `Location` or
  `Azure-AsyncOperation` header unless `x-ms-long-running-operation` is `true`.
- The native rule deliberately does not accept output-only extension overrides
  as a replacement for native polling metadata. Such overrides are also discouraged
  by Azure Core's `no-openapi` rule. Research fixtures may demonstrate emission
  differences, but production logic does not inspect OpenAPI extensions.
- Standard async templates provide polling metadata by default. Templates do
  **not** prevent every violation: sync templates accept customized responses,
  and async templates can replace semantic headers with plain URL properties.
- See [migration.md](migration.md) for supported-shape, corpus, and parity evidence.

## Test Cases

| ID                                    | Violation | Description                                                                                                 |
| ------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| `compliant-with-template`             | false     | Standard ARM async templates emit `x-ms-long-running-operation: true` for authorable PUT/PATCH/DELETE LROs. |
| `missing-lro-extension`               | true      | ARM POST action returns `200` with `Location` without polling metadata.                                     |
| `missing-azure-asyncoperation-header` | true      | ARM POST action returns `204` with `Azure-AsyncOperation` without polling metadata.                         |
| `no-async-headers`                    | false     | ARM POST action has no qualifying polling header.                                                           |
