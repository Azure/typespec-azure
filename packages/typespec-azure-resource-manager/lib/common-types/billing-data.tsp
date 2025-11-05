using Azure.Core;
using Versioning;

namespace Azure.ResourceManager.CommonTypes;

/**
 * Billing Data
 */
@added(Versions.v6)
model BillingData {
  /**
   * The system ID of the resource. Globally unique per cloud.
   */
  @visibility(Lifecycle.Read)
  systemId?: uuid;

  /**
   * Indicates the billing state of the resource.
   */
  @visibility(Lifecycle.Read)
  state?: BillingState = "Pending";

  /**
   * Indicates reason(s) for the current billing state of the resource.
   */
  @visibility(Lifecycle.Read)
  reasons?: BillingStateReason[];

  /**
   * The product identifier referencing a product in the catalog.
   */
  productCode: uuid;

  /**
   * Product token (JWT) identifying a specific version of the product.
   */
  @visibility(Lifecycle.Create)
  productToken?: string;

  /**
   * The number of instances of the product.
   */
  quantity: int64 = 1;

  /**
   * Start date indicating the beginning of the term for which the resource is committed.
   */
  startDate?: utcDateTime;

  /**
   * End date indicating the end of the term for which the resource is committed.
   */
  endDate?: utcDateTime;

  /**
   * Billing token (JWT) representing additional billing context.
   */
  @visibility(Lifecycle.Create)
  billingToken?: string;

  /**
   * The resource's billing schedule.
   */
  schedule?: BillingSchedule;
}

/**
 * Billing schedule.
 */
@added(Versions.v6)
model BillingSchedule {
  /**
   * Indicates the renewal behavior of this resource.
   */
  renewal: BillingRenewalType = "Automatic";

  /**
   * Schedules billing changes for this resource.
   */
  changes?: BillingScheduleChange[];
}

/**
 * Billing schedule change.
 */
@added(Versions.v6)
model BillingScheduleChange {
  /**
   * Indicates when the change is expected to become effective.
   */
  effective: BillingScheduleChangeEffectiveType = "Renewal";

  /**
   * The absolute date when the change is expected to become effective. Required when `effective` = `AbsoluteDate`.
   */
  effectiveDate?: utcDateTime;

  /**
   * The kind of change. 
   */
  kind: BillingScheduleChangeKind = "Update";

  /**
   * The new product identifier. When not specified, the resource's product code remains unchanged.
   */
  productCode?: uuid;

  /**
   * Product token (JWT) identifying a specific version of the scheduled product. Can only be
   * specified when productCode is specified also.
   */
  productToken?: string;

  /**
   * The new number of instances of the product. When not specified, the resource's quantity remains unchanged.
   */
  quantity?: int64;

  /**
   * The new (coterminous) end date of the product. Can only be specified when effective = renewal.
   * When not specified, the resource's end date is calculated based on the renewal date and the
   * product's term duration.
   */
  endDate?: utcDateTime;

  /**
   * Billing token (JWT) representing additional billing context.
   */
  billingToken?: string;
}

/**
 * Billing state.
 */
@added(Versions.v6)
union BillingState {
  /** Resource's billing has not yet started. */
  Pending: "Pending",

  /** Resource's billing is activate. */
  Active: "Active",

  /** Resource's billing is in a warning state. */
  Warned: "Warned",

  /** Resource's billing is inactive. */
  Inactive: "Inactive",

  string,
}

/**
 * Billing state reason.
 */
@added(Versions.v6)
union BillingStateReason {
  /** Resource's billing has been suspended by Microsoft. */
  Suspended: "Suspended",

  /** Resource's billing has expired. */
  Expired: "Expired",

  string,
}

/**
 * Type of renewal.
 */
@added(Versions.v6)
union BillingRenewalType {
  /** Automatically renew the product when its term ends. */
  Automatic: "Automatic",

  /** Don't automatically renew the product. */
  None: "None",

  string,
}

/**
 * When a scheduled change is expected to become effective.
 */
@added(Versions.v6)
union BillingScheduleChangeEffectiveType {
  /** At a specified date. */
  AbsoluteDate: "AbsoluteDate",

  /** At time of term renewal. */
  Renewal: "Renewal",

  /** When the next billing plan cycle charge occurs. */
  NextCycle: "NextCycle",

  string,
}

/**
 * When a scheduled change is expected to become effective.
 */
@added(Versions.v6)
union BillingScheduleChangeKind {
  /** Update the resource. */
  Update: "Update",

  /** Cancel the resource. */
  Cancel: "Cancel",

  string,
}
