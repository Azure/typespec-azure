This diagnostic is issued when more than one `@lroInstanceId` applies to the same operation and
emitter scope.

## How to fix

Keep one active `@lroInstanceId("lastPathSegment")` for each emitter scope. Adjust overlapping
positive or negated scopes when language-specific declarations are required.
