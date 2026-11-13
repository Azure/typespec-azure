Resource lifecycle LROs should return their resource or completion response body. Selecting a status-monitor response or property changes the generated SDK method's return type and should only be used to preserve an existing SDK contract.

This rule applies when `@clientLroResult` overrides the default result of a resource operation with its status-monitor response or one of its properties. Action and RPC LROs may select a status-monitor response or property without a warning.

These examples assume `start` is a resource lifecycle LRO whose `Job` polling response has a `result: Payload` property.

## New APIs

New APIs should return the resource response. Omit `@clientLroResult` when that is already the default, or select the resource explicitly:

```typespec
@@clientLroResult(start, Job);
```

## Existing SDK compatibility

Selecting the result property is supported when needed to preserve an existing SDK return type. The warning is expected for this compatibility usage and should be suppressed with a justification on the resource operation:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/use-valid-client-lro-result" "Preserve the return type of the existing GA SDK."
@pollingOperation(poll)
@createsOrReplacesResource(Job)
@put
op start(): Job;

@@clientLroResult(start, Job.result);
```

## Impact

- **Area:** SDK

Changing an already-shipped SDK method from the result payload to the resource response may be breaking. New APIs should use the resource response contract.
