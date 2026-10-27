This diagnostic is issued when an emitter has not opted into the advanced
metadata needed by an `@clientLroResult` selection.

## Impact

- **Area:** LRO SDK generation. The unsupported operation is not emitted as a fallback method.
- **Not affected:** Selections representable by the existing completion/extraction contract.

## How to Fix

Use a selection supported by the emitter or request emitter support for the
advanced result-selection contract. Do not suppress this error to generate a
client with an incorrect result source or extraction path.

Emitter authors may set `supportsAdvancedLroResultSelection: true` when calling
`createSdkContext` only after handling `finalResponse.resultSource`, ordered
`resultSegments`, retained monitor responses, and all mandatory completion
requests. Setting the flag does not implement that runtime behavior.
