import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description") description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("Redirect response.")
model RedirectResponse {
  @doc("Status code") @statusCode statusCode: 302;
  @doc("Redirect URI") @header("Location") location: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

namespace Nested {
  @armResourceOperations
  interface Widgets {
    get is ArmResourceRead<Widget>;
    createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
    delete is ArmResourceDeleteWithoutOkAsync<Widget>;

    @doc("Redirect widget")
    @route("redirect")
    @post
    @armResourceAction(Widget)
    redirect(...ResourceInstanceParameters<Widget>): ArmResponse<Widget> | RedirectResponse;
  }
}
