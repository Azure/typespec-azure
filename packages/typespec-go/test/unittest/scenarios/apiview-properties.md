# The APIView cross-language definition ID file maps generated Go symbols to their tsp definitions

## TypeSpec

```tsp
@service(#{ title: "Widgets" })
namespace Widgets;

enum WidgetKind {
  standard,
  deluxe,
}

model Widget {
  id: string;
  kind: WidgetKind;
}

@route("/widgets")
interface WidgetOps {
  @get get(@path id: string): Widget;

  @get
  @list
  list(): {
    @pageItems items: Widget[];
    @nextLink next?: url;
  };
}
```

## The generated apiview-properties.json

```json apiview-properties
{
  "CrossLanguagePackageId": "Widgets",
  "CrossLanguageDefinitionId": {
    "testmodule-(client *WidgetsWidgetOpsClient) Get": "Widgets.WidgetOps.get",
    "testmodule-(client *WidgetsWidgetOpsClient) NewListPager": "Widgets.WidgetOps.list",
    "testmodule-NewWidgetsClientWithNoCredential": "Widgets",
    "testmodule.ListResponse": "Widgets.list.Response.anonymous",
    "testmodule.Widget": "Widgets.Widget",
    "testmodule.WidgetKind": "Widgets.WidgetKind",
    "testmodule.WidgetKindDeluxe": "Widgets.WidgetKind.deluxe",
    "testmodule.WidgetKindStandard": "Widgets.WidgetKind.standard",
    "testmodule.WidgetsClient": "Widgets",
    "testmodule.WidgetsWidgetOpsClient": "Widgets.WidgetOps"
  },
  "CrossLanguageVersion": "4f1096576cb9"
}
```

# The APIView cross-language definition ID file isn't emitted for a containing module

## TypeSpec

```tsp
@service(#{ title: "Widgets" })
namespace Widgets;

model Widget {
  id: string;
}

@route("/widgets")
interface WidgetOps {
  @get get(@path id: string): Widget;
}
```

```yaml
containing-module: github.com/contoso/module
emitter-output-dir: "{output-dir}/widgets"
```

```json apiview-properties
// (file was not generated)
```

# The APIView cross-language definition ID file includes the ARM ClientFactory accessors

## TypeSpec

```tsp
@armProviderNamespace
namespace Microsoft.Test;

model WidgetProperties {
  description?: string;
}

model Widget is TrackedResource<WidgetProperties> {
  @path
  @key("widgetName")
  @segment("widgets")
  name: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

```json apiview-properties
{
  "CrossLanguagePackageId": "Microsoft.Test",
  "CrossLanguageDefinitionId": {
    "testmodule-(c *ClientFactory) NewWidgetsClient": "Microsoft.Test.Widgets",
    "testmodule-(client *WidgetsClient) Get": "Microsoft.Test.Widgets.get",
    "testmodule-NewWidgetsClient": "Microsoft.Test.Widgets",
    "testmodule.CreatedByType": "Azure.ResourceManager.CommonTypes.createdByType",
    "testmodule.CreatedByTypeApplication": "Azure.ResourceManager.CommonTypes.createdByType.Application",
    "testmodule.CreatedByTypeKey": "Azure.ResourceManager.CommonTypes.createdByType.Key",
    "testmodule.CreatedByTypeManagedIdentity": "Azure.ResourceManager.CommonTypes.createdByType.ManagedIdentity",
    "testmodule.CreatedByTypeUser": "Azure.ResourceManager.CommonTypes.createdByType.User",
    "testmodule.SystemData": "Azure.ResourceManager.CommonTypes.SystemData",
    "testmodule.Widget": "Microsoft.Test.Widget",
    "testmodule.WidgetProperties": "Microsoft.Test.WidgetProperties",
    "testmodule.WidgetsClient": "Microsoft.Test.Widgets"
  },
  "CrossLanguageVersion": "db730e704043"
}
```
