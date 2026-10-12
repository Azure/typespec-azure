This diagnostic is issued when `@lroOperationId` or `@lroPollingMetadata` is applied to an
operation without native Azure.Core LRO metadata. Legacy `@markAsLro` does not provide a status
monitor source.

## How to fix

Apply the decorator to an operation modeled with Azure.Core polling metadata, or remove it.
Do not suppress this diagnostic because TCGC cannot safely invent polling sources.
