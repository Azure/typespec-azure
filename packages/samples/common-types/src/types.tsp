import "@azure-tools/typespec-autorest";

import "./base.tsp";
import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/types.tsp";

using OpenAPI;
using Autorest;

namespace Azure.ResourceManager.CommonTypes;

@@extension(ApiVersionParameter.apiVersion, "x-ms-parameter-location", "client");
@@extension(SubscriptionIdParameter.subscriptionId, "x-ms-parameter-location", "client");

interface RegisterParams {
  v3(
    ...ApiVersionParameter,
    ...LocationParameter,
    ...OperationIdParameter,
    ...ResourceGroupNameParameter,
    ...SubscriptionIdParameter,
  ): void;

  // Params added in v4
  @Versioning.added(Versions.v4)
  v4(
    ...ManagementGroupNameParameter,
    ...ScopeParameter,
    ...TenantIdParameter,
    ...IfMatchHeader,
    ...IfNoneMatchHeader,
  ): void;
}
@@extension(ErrorDetail.details, "x-ms-identifiers", #["message", "target"]);

@@extension(Resource, "x-ms-azure-resource", true);
@@extension(ResourceModelWithAllowedPropertySet, "x-ms-azure-resource", true);
@@extension(OperationListResult.value, "x-ms-identifiers", #["name"]);
@@extension(ErrorDetail.additionalInfo, "x-ms-identifiers", #[]);

@useRef("./managedidentity.json#/definitions/ManagedServiceIdentity")
model ManagedServiceIdentity {}
