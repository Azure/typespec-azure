This diagnostic is issued when `@lroOperationId` cannot find a status-monitor URI in a response
header or URL-valued body property. An operation-reference-only or stepwise polling response has no
URI value from which the server-issued LRO operation identifier can be extracted.

## How to fix

Model a native status-monitor link with Azure.Core, or remove `@lroOperationId`.
