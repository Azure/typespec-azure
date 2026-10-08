import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

@doc("PUT body without the PATCH discriminator.")
model WidgetPutBody {
  @doc("A shared property.")
  sharedValue?: string;
}

@doc("Base PATCH properties with an emitted discriminator.")
@discriminator("kind")
model WidgetPatchPropertiesBase {
  @doc("A shared property.")
  sharedValue?: string;
}

@doc("Intermediate PATCH properties that inherit the discriminator.")
model WidgetPatchProperties extends WidgetPatchPropertiesBase {}

@doc("Concrete PATCH variant that makes the inherited discriminator valid.")
model ConcreteWidgetPatch extends WidgetPatchProperties {
  kind: "widget";
}

interface Operations extends Azure.ResourceManager.Operations {}

@route("/widgets/{widgetName}")
interface Widgets {
  @doc("Create or replace widget")
  @put
  createOrUpdate(
    @doc("The widget name") @path widgetName: string,
    @doc("The request body") @body body: WidgetPutBody,
  ): void;

  @doc("Update widget")
  @patch
  update(
    @doc("The widget name") @path widgetName: string,
    @doc("The request body") @body body: WidgetPatchProperties,
  ): void;
}
