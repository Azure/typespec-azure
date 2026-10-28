This diagnostic is issued when an `@clientLroResult` selection would require
changing the operation's completion response or introducing a new result.

## Impact

- **Area:** LRO SDK generation. The unsupported operation is not emitted as a fallback method.
- **Not affected:** Whole-body and property-path selections within the existing completion response.

## How to Fix

Select the whole body returned by the existing completion strategy, or a
readable property path within that body.

Retaining a monitor instead of the required final response and introducing a
result for a no-result polling protocol are not supported. The decorator does
not change polling or final requests.

TCGC can describe nested paths using `finalResponse.resultSegments`; this does
not guarantee runtime support in every language emitter. Emitter compatibility
is separate from this protocol validation.
