import "./base.tsp";
import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/types.tsp";

using OpenAPI;

namespace Azure.ResourceManager.CommonTypes;

@@extension(ApiVersionParameter.apiVersion, "x-ms-parameter-location", "client");
@@extension(SubscriptionIdParameter.subscriptionId, "x-ms-parameter-location", "client");

op registerParams(
  ...ApiVersionParameter,
  ...LocationParameter,
  ...ManagementGroupNameParameter,
  ...OperationIdParameter,
  ...ResourceGroupNameParameter,
  ...ScopeParameter,
  ...SubscriptionIdParameter,
  ...TenantIdParameter,
): void;
