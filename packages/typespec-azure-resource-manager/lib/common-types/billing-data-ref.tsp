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

/**
 * The billing state of this resource.
 */
@@armCommonDefinition(BillingState,
  "BillingState",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingstate.json"
);

/**
 * The billing state reason of this resource.
 */
@@armCommonDefinition(BillingStateReason,
  "BillingStateReason",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingstatereason.json"
);

/**
 * The billing schedule of this resource.
 */
@@armCommonDefinition(BillingSchedule,
  "BillingSchedule",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedule.json"
);

/**
 * A billing schedule change.
 */
@@armCommonDefinition(BillingScheduleChange,
  "BillingScheduleChange",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedulechange.json"
);

/**
 * A billing renewal type.
 */
@@armCommonDefinition(BillingRenewalType,
  "BillingRenewalType",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingrenewaltype.json"
);

/**
 * When a scheduled change is expected to become effective.
 */
@@armCommonDefinition(BillingScheduleChangeEffectiveType,
  "BillingScheduleChangeEffectiveType",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedulechangeeffectivetype.json"
);
