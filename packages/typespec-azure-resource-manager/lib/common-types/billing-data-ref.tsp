import "./billing-data.tsp";

using Azure.ResourceManager.CommonTypes.Private;

namespace Azure.ResourceManager.CommonTypes;

@@armCommonDefinition(BillingData,
  "BillingData",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingdata.json"
);

@@armCommonDefinition(BillingState,
  "BillingState",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingstate.json"
);

@@armCommonDefinition(BillingStateReason,
  "BillingStateReason",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingstatereason.json"
);

@@armCommonDefinition(BillingSchedule,
  "BillingSchedule",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedule.json"
);

@@armCommonDefinition(BillingScheduleChange,
  "BillingScheduleChange",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedulechange.json"
);

@@armCommonDefinition(BillingRenewalType,
  "BillingRenewalType",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingrenewaltype.json"
);

@@armCommonDefinition(BillingScheduleChangeEffectiveType,
  "BillingScheduleChangeEffectiveType",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedulechangeeffectivetype.json"
);

@@armCommonDefinition(BillingScheduleChangeKind,
  "BillingScheduleChangeKind",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "billingschedulechangekind.json"
);
