This diagnostic is issued when an `@lroOperationId` path parameter belongs to the linked status-monitor operation, but the initiating LRO does not receive the status-monitor URI in a response header or URL-valued body property. A response-model property selection does not require a URI link.

## Impact

- **Area:** LRO operation ID metadata. Generation reports an error and omits the path-derived operation ID because no polling URI is available to extract it from.
- **Not affected:** Other operation ID sources and the existing LRO polling strategy are unchanged.

## Diagnostic Message

TCGC reports:

```text
@lroOperationId requires the linked status-monitor operation to be reached through a response header or URL-valued body property.
```

## ✅ How to Fix

Model the linked polling operation with an `Operation-Location`-style response link, move `@lroOperationId` to the status-monitor response model's operation ID property, or remove it. Only model a response link if the service actually returns it; explicit polling-parameter mappings alone do not provide a URI to parse.

## Suppression

This diagnostic should not be suppressed. Model the service's response link or select a supported response-model property instead.
