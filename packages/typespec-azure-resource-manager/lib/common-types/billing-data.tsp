using Azure.Core;
using Versioning;

namespace Azure.ResourceManager.CommonTypes;

/**
 * Billing Data
 */
@added(Versions.v6)
model BillingData {
  @visibility(Lifecycle.Read)
  systemId?: uuid;

  @visibility(Lifecycle.Read)
  state?: BillingState = "Pending";

  @visibility(Lifecycle.Read)
  reasons?: BillingStateReason[];

  productCode: uuid;

  @visibility(Lifecycle.Create, Lifecycle.Update)
  productToken?: string;

  quantity: int64 = 1;
  startDate?: utcDateTime;
  endDate?: utcDateTime;

  @visibility(Lifecycle.Create, Lifecycle.Update)
  billingToken?: string;

  schedule?: BillingSchedule;
}

@added(Versions.v6)
model BillingSchedule {
  renewal: BillingRenewalType = "Automatic";
  changes?: BillingScheduleChange[];
}

@added(Versions.v6)
model BillingScheduleChange {
  effective: BillingScheduleChangeEffectiveType = "Renewal";
  effectiveDate?: utcDateTime;
  kind: BillingScheduleChangeKind = "Update";
  productCode?: uuid;

  @visibility(Lifecycle.Create, Lifecycle.Update)
  productToken?: string;

  quantity?: int64;
  endDate?: utcDateTime;

  @visibility(Lifecycle.Create, Lifecycle.Update)
  billingToken?: string;
}

@added(Versions.v6)
union BillingState {
  Pending: "Pending",
  Active: "Active",
  Warned: "Warned",
  Inactive: "Inactive",
  string,
}

@added(Versions.v6)
union BillingStateReason {
  Suspended: "Suspended",
  Canceled: "Canceled",
  Expired: "Expired",
  string,
}

@added(Versions.v6)
union BillingRenewalType {
  Automatic: "Automatic",
  None: "None",
  string,
}

@added(Versions.v6)
union BillingScheduleChangeEffectiveType {
  AbsoluteDate: "AbsoluteDate",
  Renewal: "Renewal",
  string,
}

@added(Versions.v6)
union BillingScheduleChangeKind {
  Update: "Update",
  Cancel: "Cancel",
  string,
}
