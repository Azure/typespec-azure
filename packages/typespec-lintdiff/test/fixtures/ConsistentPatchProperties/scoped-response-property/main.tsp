import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Scoped response comparison" })
namespace Microsoft.TestService;

/** Resource with a property available in the native model only. */
model Widget {
  /** Resource name. */
  name?: string;

  /** Property omitted from AutoRest output. */
  @scope("csharp")
  description?: string;
}

/** Native update body is a same-level subset of Widget. */
model WidgetUpdate {
  /** Updated description. */
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Update the widget. */
@route("/widgets")
@patch
op update(
  /** Update body. */
  @body body: WidgetUpdate,
): Widget;
