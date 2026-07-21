This diagnostic is issued when an array parameter uses `@encode` with an array encoding other than `ArrayEncoding.pipeDelimited` or `ArrayEncoding.spaceDelimited` for collection format.

To fix this issue, use `ArrayEncoding.pipeDelimited`, use `ArrayEncoding.spaceDelimited`, rely on the default CSV format, or use exploded query serialization.
