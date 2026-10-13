This diagnostic is issued when `@lroInstanceId` cannot find a status-monitor URI in a response
header or body property. An operation-reference-only polling step has no URI value from which a
running LRO instance identifier can be extracted.

## How to fix

Model a native status-monitor link with Azure.Core, or remove `@lroInstanceId`.
