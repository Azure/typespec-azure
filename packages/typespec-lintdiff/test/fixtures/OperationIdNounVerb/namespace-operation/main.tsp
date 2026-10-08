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

namespace Admins {
  @doc("An admin resource")
  model Admin {
    @doc("The admin name")
    name: string;
  }

  @route("/admins")
  @doc("List admins")
  @get
  op listAdmins(@query("api-version") @doc("API version") apiVersion: string): Admin[];
}
