This diagnostic is issued when an HTTP parameter is expected to have one kind, such as `body`, `path`, `query`, or `header`, but resolves to a different kind.

To fix this issue, check decorators such as `@path`, `@query`, `@header`, and `@body` so the TypeSpec parameter matches the expected HTTP location.
