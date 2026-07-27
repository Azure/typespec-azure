// Test: sku-not-optional
// Violation: PATCH response has sku but PATCH body doesn't include it.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("SKU info")
model Sku {
  @doc("Name")
  name: string;

  @doc("Tier")
  tier?: string;
}

@doc("Widget response with sku")
model WidgetResponse {
  @doc("Name")
  name: string;

  @doc("SKU property")
  sku?: Sku;
}

@doc("Widget patch body - missing sku")
model WidgetPatchBody {
  @doc("Name")
  name?: string;
}

@route("/widgets/{name}")
interface Widgets {
  @doc("Get a widget")
  @get get(@path @doc("Widget name") name: string): WidgetResponse;

  @doc("Update a widget")
  @patch update(
    @path @doc("Widget name") name: string,
    @body @doc("Widget update") body: WidgetPatchBody,
  ): WidgetResponse;
}
