Selected-version resolution found an operation registration that does not match the resource model produced for that version. Resolution returns an empty provider rather than publishing an inconsistent resource graph.

Custom operation decorators must pass resource models through decorator arguments so the compiler can transform those arguments when constructing a version snapshot. Do not recover resource models from the original program or retain a model from another snapshot in a JavaScript closure.

For example, accept the resource as an argument and forward it to `@armResourceRead` rather than calling `program.resolveTypeReference` during decorator replay. Prefer the standard ARM operation templates when possible.
