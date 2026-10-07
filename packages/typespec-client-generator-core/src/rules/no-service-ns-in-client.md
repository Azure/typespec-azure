`client.tsp` is for client-only customization. It must not reopen the service
namespace or any child namespace under it, because doing so injects new API
surface into the service definition and changes the spec point of view.

Keep new helper types in a separate namespace such as `Customizations`, and use
augment decorators (`@@...`) when you need to customize generated client
behavior for existing service types.

## Impact

- **Area:** Client customization authoring for SDK generation. Affects both
  data-plane and management-plane specs that use `client.tsp`.
- **Not affected:** The intended service definition and wire protocol are
  unchanged when `client.tsp` stays API-neutral; this rule prevents accidental
  service-surface changes from customization files.

## ❌ Incorrect Usage

```tsp
// main.tsp
@service
namespace Contoso.Widget;

// client.tsp
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

namespace Contoso.Widget;

model WidgetClientOptions {
  mode: string;
}
```

## Diagnostic Message

For the `client.tsp` file above, the linter reports the reopened service
namespace:

```text
client.tsp must not declare the service namespace 'Contoso.Widget' or any of its child namespaces. Use augment decorators for service types and place new helper types in a separate namespace.
```

## ✅ How to Fix

Keep new helper types in a different namespace:

```tsp
// client.tsp
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;
using Contoso.Widget;

namespace Customizations;

model WidgetClientOptions {
  mode: string;
}

@@clientName(Widget.name, "widgetName");
```

## Suppression

This rule should not be suppressed. Although it is reported as a `warning`,
reopening the service namespace from `client.tsp` changes the API surface and
breaks the intended split between service definition and client-only
customization.
