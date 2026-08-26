import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

/** A data-plane widget. */
model Widget {
  /** The widget name. */
  name: string;
}

interface Widgets {
  /** Create or replace a widget. */
  @route("/providers/Microsoft.TestService/widgets/{widgetName}")
  @put
  createOrReplace(
    @path
    @doc("The widget name")
    widgetName: string,

    @query("api-version")
    @doc("The API version")
    apiVersion: string,

    @body
    @doc("The widget")
    body: Widget,
  ): Widget;
}
