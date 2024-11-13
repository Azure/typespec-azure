import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.Core.Traits;

@service
@versioned(Contoso.WidgetManager.Versions)
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-Key">)
namespace Contoso.WidgetManager;

@doc("The Contoso Widget Manager service version.")
enum Versions {
  @doc("Version 2022-08-31")
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  `2022-08-31`,
}

// Models ////////////////////

@doc("A widget.")
@resource("widgets")
model Widget {
  @key("widgetName")
  @doc("The widget name.")
  @visibility("read")
  name: string;

  /** Side id as a uuid */
  siteId: uuid;

  /** IpV6 of widget */
  ipV4: ipV4Address;

  /** IpV6 of widget */
  ipV6: ipV6Address;

  ...EtagProperty;
}

@error
@doc("A custom error type for the Widget Manager service.")
model WidgetServiceErrorResponse {
  @doc("The numeric error code.")
  code: int32;

  @doc("The error message.")
  errorMessage: string;
}

// Operations ////////////////////

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits, WidgetServiceErrorResponse>;

@doc("Get a Widget")
op getWidget is Operations.ResourceRead<Widget>;
