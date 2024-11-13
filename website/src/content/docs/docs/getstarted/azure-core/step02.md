---
title: 2. Create the service namespace
---

To describe a service, you first need to define a "blockless" (file-level, no curly braces) namespace and use the `@service` decorator to mark it as the service namespace:

```typespec
@service({
  title: "Contoso Widget Manager",
})
namespace Contoso.WidgetManager;
```

This marks the `Contoso.WidgetManager` namespace as a service namespace in this TypeSpec specification and sets its title to "Contoso Widget Manager."
