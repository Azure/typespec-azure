This diagnostic is issued when more than one `@lroOperationId` applies to the same operation and
emitter scope.

## How to fix

Keep one active `@lroOperationId` for each emitter scope. Adjust overlapping positive or negated
scopes when language-specific declarations are required.
