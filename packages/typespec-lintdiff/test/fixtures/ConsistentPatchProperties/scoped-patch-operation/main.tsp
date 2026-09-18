import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Scoped PATCH comparison" })
namespace Microsoft.TestService;

/** Resource returned by the service. */
model Widget {
  /** Resource name. */
  name?: string;
}

/** Native update body with an extra property. */
model WidgetUpdate {
  /** Property absent from the resource. */
  extra?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Read the widget. */
@route("/widgets")
@get
op read(): Widget;

/** Update the widget in the native HTTP contract, but not AutoRest output. */
@route("/widgets")
@patch
@scope("csharp")
op update(
  /** Update body. */
  @body body: WidgetUpdate,
): Widget;
