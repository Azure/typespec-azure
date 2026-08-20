import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService")
interface Operations {
  @get
  @route("/locations/{location}/widgets")
  listByLocation(
    ...SubscriptionIdParameter,
    ...LocationParameter,
  ): {
    @body body: WidgetListResult;
  };
}

model WidgetListResult {
  value: Widget[];
}

model Widget {
  name: string;
}
