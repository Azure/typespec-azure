import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;
using Azure.Core;
using Azure.Core.Traits;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget resource")
@resource("widgets")
model Widget {
  @key
  @doc("The widget ID")
  @visibility(Lifecycle.Read)
  id: string;

  @doc("The widget status")
  @visibility(Lifecycle.Read)
  #suppress "@azure-tools/typespec-azure-core/no-openapi" "test"
  @extension("x-ms-mutability", #["read", "create"])
  status: string;
}

alias ServiceTraits = NoClientRequestId & NoConditionalRequests & NoRepeatableRequests;
alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  @doc("Get a widget")
  get is Operations.ResourceRead<Widget>;
}
