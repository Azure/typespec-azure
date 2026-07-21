This diagnostic is issued when two generated SDK declarations share the same client name. This is by design for languages such as C# that use the duplicated name to produce overloads.

To fix this issue, confirm that the duplicated name is intentional for the target language's overloading behavior and suppress this diagnostic; otherwise give the declarations unique names, for example with `@clientName`.
