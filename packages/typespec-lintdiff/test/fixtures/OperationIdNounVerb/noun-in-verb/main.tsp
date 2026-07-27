import "@typespec/http";
import "@typespec/rest";
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

@doc("A path resource")
model PathItem {
  @doc("The path name")
  name: string;
}

@route("/api/paths")
interface Paths {
  @doc("List paths")
  @get
  listPaths(@query("api-version") @doc("API version") apiVersion: string): PathItem[];
}
