This diagnostic is issued when `@clientLroResult` cannot select an envelope response
or a supported direct property of the status-monitor envelope.

## Impact

- **Area:** LRO SDK result selection. The invalid customization is ignored and the default
  method contract is retained, but the error still prevents a successful emit.
- **Not affected:** The operation's polling and required completion requests are not rewritten.

## How to Fix

Use an envelope response returned by the existing LRO strategy or a direct property
of its status-monitor envelope. Do not pass an unrelated replacement model or a
nested property.

Resource lifecycle operations return their resource or completion response by
default. Overriding that default with a status-monitor response or property reports
the suppressible `use-valid-client-lro-result` warning.

An ordinary operation or a legacy LRO marker without native protocol metadata is
not a valid target. New optional/nullable projections are not supported without
a missing-value contract.
