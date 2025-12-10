import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

namespace Microsoft.ContosoProviderHub;

/** A ContosoProviderHub resource */
#suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "For sample purpose"
model Cost is Azure.ResourceManager.Legacy.DiscriminatedExtensionResource {
  ...ResourceNameParameter<Cost>;
}

/** The rp-specific properties of the cost */
model CapitalProperties {
  /** The amount of capital */
  amount?: float64;

  ...DefaultProvisioningStateProperty;
}

/** The properties of an expense */
model ExpenseProperties {
  /** The amount of the expense */
  amount?: float64;

  /** The duration of the expense */
  duration?: duration;

  ...DefaultProvisioningStateProperty;
}

/** Salaried employee */
model Capital extends Cost {
  kind: "capital";
  properties: CapitalProperties;
}

/** Hourly employee */
model Expense extends Cost {
  kind: "expense";
  properties: ExpenseProperties;
}

@armResourceOperations
interface Costs<Parent extends Foundations.SimpleResource> {
  get is Extension.Read<Parent, Cost>;
  list is Extension.ListByTarget<Parent, Cost>;
}
@armResourceOperations
interface Scopes extends Costs<Extension.ScopeParameter> {}
@armResourceOperations
interface Tenants extends Costs<Extension.Tenant> {}
@armResourceOperations
interface Subscriptions extends Costs<Extension.Subscription> {}
@armResourceOperations
interface ManagementGroups extends Costs<Extension.ManagementGroup> {}
