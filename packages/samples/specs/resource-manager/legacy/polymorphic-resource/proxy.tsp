import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

namespace Microsoft.ContosoProviderHub;

/** A ContosoProviderHub resource */
#suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "For sample purpose"
@subscriptionResource
model Room is Azure.ResourceManager.Legacy.DiscriminatedProxyResource {
  ...ResourceNameParameter<Room>;
}

@doc("The rp-specific properties of the room")
model ConferenceRoomProperties {
  /** The number of occupants */
  capacity?: int32;

  /** The city of current residence */
  city?: string;

  ...DefaultProvisioningStateProperty;
}

/** The properties of an office */
model OfficeProperties {
  /** The number of desks in the office */
  desks?: int32;

  /** The city of current residence */
  city?: string;

  ...DefaultProvisioningStateProperty;
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
