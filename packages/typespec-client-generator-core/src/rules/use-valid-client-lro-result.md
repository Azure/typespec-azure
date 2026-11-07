Resource lifecycle LROs should return their resource or completion response body.
Selecting the status-monitor result property changes the generated SDK method's
return type and should only be used to preserve an existing SDK contract.

This rule applies when `@clientLroResult` selects the established result property
for a resource PUT, PATCH, or DELETE operation. Action and RPC LROs may select
their established result property without a warning.

The rule is enabled by default in the `client-sdk` ruleset.

These examples assume `start` is a resource lifecycle LRO whose `Job` polling
response has `@lroResult result: Payload`.

#### ❌ Incorrect

```typespec
@@clientLroResult(start, Job.result);
```

#### ✅ Correct

```typespec
@@clientLroResult(start, Job);
```

## Impact

- **Area:** SDK

Changing an already-shipped SDK method from the result payload to the resource
response may be breaking. New APIs should use the resource response contract.

## Suppression

For an existing GA SDK, suppress the warning on the resource operation with a
compatibility justification:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/use-valid-client-lro-result" "Preserve the return type of the existing GA SDK."
@pollingOperation(poll)
@createsOrReplacesResource(Job)
@put
op start(): Job;

@@clientLroResult(start, Job.result);
```
