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

model Item {
  id: string;
}

@friendlyName("Widget", T)
model Wrapper<T> {
  value: T;
}

@friendlyName("Gizmo", T)
union Choice<T> {
  item: T,
  empty: "empty",
  other: string,
}

namespace Operations {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  interface Widget {
    @route("/widgets")
    @get
    read(): TestService.Wrapper<TestService.Item>;
  }

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  interface Gizmo {
    @route("/gizmos")
    @get
    read(): TestService.Choice<"one">;
  }
}
