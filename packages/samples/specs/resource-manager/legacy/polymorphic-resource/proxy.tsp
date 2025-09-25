import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

namespace Microsoft.ContosoProviderHub;

@subscriptionResource
@doc("A ContosoProviderHub resource")
model Room is Azure.ResourceManager.Legacy.DiscriminatedProxyResource {
  ...ResourceNameParameter<Room>;
}

@doc("The rp-specific properties of the room")
model ConferenceRoomProperties {
  @doc("The number of occupants")
  capacity?: int32;

  @doc("The city of current residence")
  city?: string;

  @visibility(Lifecycle.Read)
  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

/** The properties of an office */
model OfficeProperties {
  @doc("The number of desks in the office")
  desks?: int32;

  @doc("The city of current residence")
  city?: string;

  @visibility(Lifecycle.Read)
  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

/** Salaried employee */
model ConferenceRoom extends Room {
  kind: "conference";
  properties: ConferenceRoomProperties;
}

/** Hourly employee */
model Office extends Room {
  kind: "office";
  properties: OfficeProperties;
}

@armResourceOperations
interface Rooms {
  get is ArmResourceRead<Room>;
  list is ArmResourceListByParent<Room>;
}
