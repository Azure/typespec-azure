---
title: "no-service-namespace-redefinition"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/no-service-namespace-redefinition
```

`client.tsp` is for client-only customization. It must not reopen the service
namespace or any child namespace under it, because doing so injects new API
surface into the service definition and changes the spec point of view.

Keep new helper types in a separate namespace such as `Customizations`, and use
augment decorators (`@@...`) when you need to customize generated client
behavior for existing service types.

#### ❌ Incorrect

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

#### ✅ Correct

```tsp
// main.tsp
@service
namespace Contoso.Widget;

model Widget {
  name: string;
}

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
