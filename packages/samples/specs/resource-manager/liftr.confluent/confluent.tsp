import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;
using Azure.ResourceManager.Foundations;
using Autorest;

@armProviderNamespace
@service({
  title: "Microsoft.Confluent",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.Confluent;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A string that represents a URI.")
scalar Uri extends string;

@doc("Reusable representation of an email address")
@pattern("\\w+@\\w+\\.\\w+")
scalar email extends string;

@doc("Shorthand for setting length limit.")
@minLength(5)
@maxLength(50)
scalar MediumString extends string;

@doc("Shorthand for setting length limit.")
@maxLength(25)
scalar ShortString extends string;

@doc("Details of the Confluent organization.")
model Organization is TrackedResource<OrganizationProperties> {
  @doc("Organization resource name")
  @key("organizationName")
  @segment("organizations")
  @path
  name: string;
}

@armResourceOperations
interface Organizations extends TrackedResourceOperations<Organization, OrganizationProperties> {}

@doc("Details of the Confluent organization.")
model OrganizationProperties {
  @doc("UTC Time when Organization resource was created.")
  @visibility("read")
  createdTime?: utcDateTime;

  @doc("Id of the Confluent organization.")
  @visibility("read", "create")
  organizationId: string;

  @doc("Single sign-on url for the Confluent organization.")
  @visibility("read", "create")
  ssoUrl: Uri;

  @doc("Details of the product offering.")
  offerDetail: OfferDetail;

  @doc("Subscriber details.")
  userDetail: UserDetail;

  ...DefaultProvisioningStateProperty;
}

@doc("SaaS offer status.")
enum OfferStatus {
  @doc("Offer started.")
  Started,

  @doc("Offer pending fulfillment start.")
  PendingFulfillmentStart,

  @doc("Offer in progress.")
  InProgress,

  @doc("Offer subscribed.")
  Subscribed,

  @doc("Offer suspended.")
  Suspended,

  @doc("Offer reinstated.")
  Reinstated,

  @doc("Offer succeeded.")
  Succeeded,

  @doc("Offer failed.")
  Failed,

  @doc("Offer unsubscribed.")
  Unsubscribed,

  @doc("Offer updating.")
  Updating,
}

@doc("Details of the product offering.")
model OfferDetail {
  @doc("Id of the product publisher.")
  publisherId: MediumString;

  @doc("Id of the product offering.")
  id: MediumString;

  @doc("Id of the product offer plan.")
  planId: MediumString;

  @doc("Name of the product offer plan.")
  planName: MediumString;

  @doc("Offer plan term unit.")
  termUnit: ShortString;

  @doc("SaaS offer status.")
  status: OfferStatus;
}

@doc("Details of the subscriber")
model UserDetail {
  @doc("Subscriber first name.")
  firstName: MediumString;

  @doc("Subscriber last name.")
  lastName: MediumString;

  @doc("Subscriber email address.")
  emailAddress: email;
}

@doc("The details of a marketplace agreement.")
@singleton
model ConfluentAgreementResource is ProxyResource<ConfluentAgreementResourceProperties> {
  @key
  @segment("agreements")
  @path
  @doc("The name fo the agreement")
  name: string;
}

@doc("The details of the agreement.")
model ConfluentAgreementResourceProperties {
  ...DefaultProvisioningStateProperty;
}

#suppress "@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation" "AN agreement can only be deleted out of band."
@armResourceOperations(ConfluentAgreementResource)
interface MarketplaceAgreements extends ResourceListBySubscription<ConfluentAgreementResource> {
  @put
  @doc("Create a new marketplace agreement.")
  @armResourceCreateOrUpdate(ConfluentAgreementResource)
  create(
    ...SubscriptionScope<ConfluentAgreementResource>,
    ...KeysOf<ConfluentAgreementResource>,

    @doc("The agreement details.")
    @body
    agreement: ConfluentAgreementResource,
  ): ArmResponse<ConfluentAgreementResource> | ErrorResponse;
}
