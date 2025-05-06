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
  systemId: uuid;

  /** 
   * The product identifier.
   */
  productCode: uuid;

  /**
   * Product token (JWT) identifying a specific version of the product.
   */
  productToken?: string;

  /** 
   * The number of instances of the product.
   */
  quantity: int64 = 1;

  /**
   * Start date indicating the beginning of the term for which the resource is prepaid.
   */
  startDate?: utcDateTime;

  /**
   * End date indicating the end of the term for which the resource is prepaid.
   */
  endDate?: utcDateTime;

  /**
   * Billing token (JWT) representing additional billing context.
   */
  billingToken?: string;
}

/**
 * Billing schedule
 */
@added(Versions.v6)
model BillingSchedule {
  /**
   * Date when this resource is expected to be invoiced next.
   */
  nextInvoiceDate: utcDateTime;

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
 * Billing schedule change
 */
@added(Versions.v6)
model BillingScheduleChange {
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
  quantity?: int64 = 1;

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

  /**
   * Indicates when the change is expected to become effective.
   */
  effective: BillingEffectiveType = "Renewal";
}

/**
 * Type of renewal.
 */
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
union BillingEffectiveType {
  /** At time of term renewal. */
  Renewal: "Renewal",

  /** When the next billing plan cycle charge occurs. */
  NextCycle: "NextCycle",

  /** At a specific, absolute date. */
  Absolute: "Absolute",

  string,
}
