import "../private.decorators.tsp";
import "./common-types.tsp";
import "./types.tsp";

using Azure.ResourceManager.Private;
using Azure.ResourceManager.CommonTypes.Private;

namespace Azure.ResourceManager.CommonTypes;

/** Common resource fields that are returned in the response for all Azure Resource Manager resources. */
@@armCommonDefinition(Resource, "Resource", Azure.ResourceManager.CommonTypes.Versions.v3);
@@armCommonDefinition(Resource, "Resource", Azure.ResourceManager.CommonTypes.Versions.v4);
@@armCommonDefinition(Resource, "Resource", Azure.ResourceManager.CommonTypes.Versions.v5);

/** The resource model definition for an Azure Resource Manager resource with an etag. */
@@armCommonDefinition(AzureEntityResource,
  "TrackedResource",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(AzureEntityResource,
  "TrackedResource",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(AzureEntityResource,
  "TrackedResource",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The base tracked resource.
 */
@@armCommonDefinition(TrackedResource,
  "TrackedResource",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(TrackedResource,
  "TrackedResource",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(TrackedResource,
  "TrackedResource",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The base proxy resource.
 */
@@armCommonDefinition(ProxyResource,
  "ProxyResource",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(ProxyResource,
  "ProxyResource",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(ProxyResource,
  "ProxyResource",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The base extension resource.
 */
@@armCommonDefinition(ExtensionResource,
  "ProxyResource",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(ExtensionResource,
  "ProxyResource",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(ExtensionResource,
  "ProxyResource",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The SKU (Stock Keeping Unit) assigned to this resource.
 */
@@armCommonDefinition(Sku, "Sku", Azure.ResourceManager.CommonTypes.Versions.v3);
@@armCommonDefinition(Sku, "Sku", Azure.ResourceManager.CommonTypes.Versions.v4);
@@armCommonDefinition(Sku, "Sku", Azure.ResourceManager.CommonTypes.Versions.v5);

/**
 * A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.
 */
@@armCommonDefinition(OperationListResult,
  "OperationListResult",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(OperationListResult,
  "OperationListResult",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(OperationListResult,
  "OperationListResult",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * Details of a REST API operation, returned from the Resource Provider Operations API
 */
@@armCommonDefinition(Operation, "Operation", Azure.ResourceManager.CommonTypes.Versions.v3);
@@armCommonDefinition(Operation, "Operation", Azure.ResourceManager.CommonTypes.Versions.v4);
@@armCommonDefinition(Operation, "Operation", Azure.ResourceManager.CommonTypes.Versions.v5);

/**
 * Localized display information for and operation.
 */
@@armCommonDefinition(OperationDisplay,
  "OperationDisplay",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(OperationDisplay,
  "OperationDisplay",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(OperationDisplay,
  "OperationDisplay",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The current status of an async operation.
 */
@@armCommonDefinition(OperationStatusResult,
  "OperationStatusResult",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(OperationStatusResult,
  "OperationStatusResult",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(OperationStatusResult,
  "OperationStatusResult",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The default operationId parameter type.
 */
@@armCommonDefinition(OperationIdParameter,
  "OperationIdParameter",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(OperationIdParameter,
  "OperationIdParameter",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(OperationIdParameter,
  "OperationIdParameter",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The error detail.
 */
@@armCommonDefinition(ErrorDetail, "ErrorDetail", Azure.ResourceManager.CommonTypes.Versions.v3);
@@armCommonDefinition(ErrorDetail, "ErrorDetail", Azure.ResourceManager.CommonTypes.Versions.v4);
@@armCommonDefinition(ErrorDetail, "ErrorDetail", Azure.ResourceManager.CommonTypes.Versions.v5);

/**
 * The resource management error additional info.
 */
@@armCommonDefinition(ErrorAdditionalInfo,
  "ErrorAdditionalInfo",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(ErrorAdditionalInfo,
  "ErrorAdditionalInfo",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(ErrorAdditionalInfo,
  "ErrorAdditionalInfo",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * Metadata pertaining to creation and last modification of the resource.
 */
@@armCommonDefinition(SystemData, "systemData", Azure.ResourceManager.CommonTypes.Versions.v3);
@@armCommonDefinition(SystemData, "systemData", Azure.ResourceManager.CommonTypes.Versions.v4);
@@armCommonDefinition(SystemData, "systemData", Azure.ResourceManager.CommonTypes.Versions.v5);

/**
 * Details of the resource plan.
 */
@@armCommonDefinition(Plan, "Plan", Azure.ResourceManager.CommonTypes.Versions.v3);
@@armCommonDefinition(Plan, "Plan", Azure.ResourceManager.CommonTypes.Versions.v4);
@@armCommonDefinition(Plan, "Plan", Azure.ResourceManager.CommonTypes.Versions.v5);

/**
 * The check availability request body.
 */
@@armCommonDefinition(CheckNameAvailabilityRequest,
  "CheckNameAvailabilityRequest",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(CheckNameAvailabilityRequest,
  "CheckNameAvailabilityRequest",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(CheckNameAvailabilityRequest,
  "CheckNameAvailabilityRequest",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

/**
 * The check availability result.
 */
@@armCommonDefinition(CheckNameAvailabilityResponse,
  "CheckNameAvailabilityResponse",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(CheckNameAvailabilityResponse,
  "CheckNameAvailabilityResponse",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(CheckNameAvailabilityResponse,
  "CheckNameAvailabilityResponse",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

@@armCommonParameter(ApiVersionParameter.apiVersion,
  "ApiVersionParameter",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonParameter(ApiVersionParameter.apiVersion,
  "ApiVersionParameter",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonParameter(ApiVersionParameter.apiVersion,
  "ApiVersionParameter",
  Azure.ResourceManager.CommonTypes.Versions.v5
);

@@resourceParameterBaseFor(ApiVersionParameter.apiVersion,
  [
    ResourceHome.ResourceGroup,
    ResourceHome.Subscription,
    ResourceHome.Location,
    ResourceHome.Tenant,
    ResourceHome.Extension
  ]
);

@@armCommonParameter(SubscriptionIdParameter.subscriptionId,
  "SubscriptionIdParameter",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonParameter(SubscriptionIdParameter.subscriptionId,
  "SubscriptionIdParameter",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonParameter(SubscriptionIdParameter.subscriptionId,
  "SubscriptionIdParameter",
  Azure.ResourceManager.CommonTypes.Versions.v5
);
@@resourceParameterBaseFor(SubscriptionIdParameter.subscriptionId,
  [ResourceHome.ResourceGroup, ResourceHome.Subscription, ResourceHome.Location]
);

@@armCommonDefinition(ErrorResponse,
  "ErrorResponse",
  Azure.ResourceManager.CommonTypes.Versions.v3
);
@@armCommonDefinition(ErrorResponse,
  "ErrorResponse",
  Azure.ResourceManager.CommonTypes.Versions.v4
);
@@armCommonDefinition(ErrorResponse,
  "ErrorResponse",
  Azure.ResourceManager.CommonTypes.Versions.v5
);
