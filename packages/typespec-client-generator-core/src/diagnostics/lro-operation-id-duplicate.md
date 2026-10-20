This diagnostic is issued when more than one path parameter on the same linked status-monitor
operation has an active `@lroOperationId` declaration for the current emitter.

## How to fix

Keep one active `@lroOperationId` path parameter for each emitter scope. Adjust overlapping positive
or negated scopes when language-specific declarations are required.
