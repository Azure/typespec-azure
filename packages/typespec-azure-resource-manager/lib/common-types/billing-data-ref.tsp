import "./billing-data.tsp";

using Azure.ResourceManager.CommonTypes.Private;

namespace Azure.ResourceManager.CommonTypes;

/**
 * The billing properties of this resource.
 */
@@armCommonDefinition(BillingData,
  "BillingData",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingdata.json"
);
