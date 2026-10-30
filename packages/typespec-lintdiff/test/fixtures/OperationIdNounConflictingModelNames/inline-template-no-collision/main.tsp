import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("An item")
model Item {
  @doc("The item ID")
  id: string;
}

@doc("A widget wrapper")
model Widget<T> {
  @doc("The wrapped item")
  value: T;
}

@doc("Possible gizmo values")
union Gizmo<T> {
  @doc("The selected value")
  item: T,

  @doc("The empty value")
  empty: "empty",

  @doc("Other gizmo values")
  other: string,
}

namespace Operations {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  interface Widget {
    @route("/widgets/{name}")
    @doc("Get a widget")
    @get
    get(
      @path @doc("Widget name") name: string,
      @query("api-version") @doc("API version") apiVersion: string,
    ): TestService.Widget<TestService.Item>;
  }

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  interface Gizmo {
    @route("/gizmos")
    @doc("Get a gizmo")
    @get
    get(@query("api-version") @doc("API version") apiVersion: string): TestService.Gizmo<"one">;
  }
}
