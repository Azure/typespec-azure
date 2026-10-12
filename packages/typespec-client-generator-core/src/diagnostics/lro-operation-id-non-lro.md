This diagnostic is issued when `@lroOperationId` is applied to an operation that does not have
native long-running operation metadata with a status monitor.

Apply `@lroOperationId` only to a native long-running operation whose status-monitor URI is
available from a response header or body property.
