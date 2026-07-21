This diagnostic is issued when `@markAsLro` is applied to an operation that already has real LRO metadata.

To fix this issue, remove `@markAsLro` from operations that are already modeled as long-running operations.
