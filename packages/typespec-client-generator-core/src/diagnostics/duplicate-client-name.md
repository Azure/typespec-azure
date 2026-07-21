This diagnostic is issued when two generated SDK declarations have the same client name in the same language scope and the duplicate is an error for that scope.

To fix this issue, rename one declaration with `@clientName`, change the applicable scope, or otherwise make generated names unique.

### Example

```typespec
using Azure.ClientGenerator.Core;

@clientName("Widget")
model WidgetResponse {}

model Widget {}
```

Both declarations generate the client name `Widget`; rename one of them or scope the rename to avoid the collision.
