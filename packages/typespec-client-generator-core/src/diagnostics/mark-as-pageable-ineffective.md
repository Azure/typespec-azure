This diagnostic is issued when `@markAsPageable` is applied to an operation that is already marked pageable with `@list`.

To fix this issue, remove `@markAsPageable` and keep the existing `@list` pageable metadata.
