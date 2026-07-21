This diagnostic is issued when an operation marked pageable with `@list` does not return a valid paging model, or paging metadata cannot be resolved from the response.

To fix this issue, update the response model to use paging decorators such as `@pageItems` and `@nextLink`, or remove the pageable/list decoration.
