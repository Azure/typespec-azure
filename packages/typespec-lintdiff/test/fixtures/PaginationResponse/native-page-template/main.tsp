// Test: native-page-template
// Compliance: Azure.Core paging metadata prevents a false missing-pageable warning.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
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
  @doc("Widget ID")
  @visibility(Lifecycle.Read)
  id: string;

  @doc("Widget name")
  name: string;
}

alias ServiceTraits = NoClientRequestId & NoConditionalRequests & NoRepeatableRequests;
alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  @doc("List widgets")
  list is Operations.ResourceList<Widget>;
}
