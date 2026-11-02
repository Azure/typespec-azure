This diagnostic is issued when `@clientLroResult` cannot select a response body
or the established result property from the operation's LRO protocol.

## Impact

- **Area:** LRO SDK result selection. The invalid customization is ignored and the default
  method contract is retained, but the error still prevents a successful emit.
- **Not affected:** The operation's polling and required completion requests are not rewritten.

## How to Fix

Use a body returned by the existing LRO strategy or its direct status-monitor
`@lroResult` property. Do not pass an unrelated replacement model, another
response property, or a nested property.

Resource lifecycle operations return their resource or completion response by
default. Selecting their established result property is supported for compatibility,
but reports the suppressible `use-valid-client-lro-result` warning.

An ordinary operation or a legacy LRO marker without native protocol metadata is
not a valid target. New optional/nullable projections are not supported without
a missing-value contract.
