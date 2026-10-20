This diagnostic is issued when an `@lroOperationId` path parameter belongs to the linked
status-monitor operation, but the initiating LRO does not receive the status-monitor URI in a
response header or URL-valued body property.

## How to fix

Model the linked polling operation with an `Operation-Location`-style response link, or remove
`@lroOperationId`.
