This diagnostic is issued when two generated SDK declarations have the same client name in a scope where TCGC reports a warning instead of an error, such as C# operation overload scenarios.

To fix this issue, prefer unique generated names or explicit `@clientName` values unless the duplicate is intentional for that emitter.
