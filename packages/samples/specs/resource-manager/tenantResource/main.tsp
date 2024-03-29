import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/openapi";

using TypeSpec.Rest;
using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service({
  title: "Microsoft.Contoso",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@OpenAPI.info({
  version: "2022-05-22-preview",
})
namespace Microsoft.Contoso;

interface Operations extends Azure.ResourceManager.Operations {}

@minValue(0)
scalar UnsignedInt extends int32;

// Tracked Resource
model Building is TrackedResource<BuildingProperties> {
  @doc("The name of the building")
  @segment("buildings")
  @key("buildingName")
  @TypeSpec.Http.path
  name: string;

  ...ManagedServiceIdentity;
  ...ResourceSku;
  ...ManagedBy;
}

@doc("The rp-specific building properties")
model BuildingProperties {
  @doc("The street address")
  @visibility("read", "create")
  streetAddress: string;

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(Building)
interface Buildings extends TrackedResourceOperations<Building, BuildingProperties> {
  @doc("Get out!")
  @post
  @action
  @armResourceAction(Building)
  evacuate(...ResourceInstanceParameters<Building>): ArmResponse<Building> | ErrorResponse;
}

@parentResource(Building)
model Room is ProxyResource<RoomProperties> {
  @doc("The room name")
  @key("roomName")
  @segment("rooms")
  @path
  name: string;
}

// Proxy Child Resource
@doc("rp-specific room properties")
model RoomProperties {
  @doc("The number of desks")
  desks: UnsignedInt;

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(Room)
interface Rooms extends ProxyResourceOperations<Room> {}

//ExtensionResource

@doc("A Permission Resource")
model Permission is ExtensionResource<PermissionProperties> {
  @doc("The name of the permission resource")
  @segment("permissions")
  @key("permissionName")
  @path
  name: string;
}

@doc("The resource-specific properties of a Permissions resource")
model PermissionProperties {
  @doc("includes permission to read the target resource")
  read: boolean;

  @doc("includes permission to write to the target resource")
  write: boolean;

  @doc("includes permission to execute the target resource")
  execute: boolean;

  @doc("includes permission to delete the target resource")
  delete: boolean;

  @doc("The principals given this permission")
  principalName: string[];

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(Permission)
interface Permissions extends ExtensionResourceOperations<Permission, PermissionProperties> {}

// Tenant Resource

@Azure.ResourceManager.tenantResource
model Widget is ProxyResource<WidgetProperties> {
  @doc("The name of the widget")
  @key("widgetName")
  @segment("widgets")
  @path
  @visibility("read")
  name: string;
}

@doc("The properties of a widget")
model WidgetProperties {
  @doc("The color of the widget")
  color: string;

  @doc("The weight of the widget in (integral) pounds")
  weightInPounds?: UnsignedInt;

  @doc("The weight in kilograms")
  weightInKilograms?: float32;

  @doc("The spin of the widget")
  spin?: Spin;

  ...DefaultProvisioningStateProperty;
}

#suppress "@azure-tools/typespec-azure-core/no-enum" "Sample"
@Azure.Core.fixed
@doc("Spin.")
enum Spin {
  @doc("Up")
  up,

  @doc("Down")
  down,
}

@armResourceOperations(Widget)
interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
  @autoRoute
  @doc("Flip to the opposite of the current spin")
  @post
  @armResourceAction(Widget)
  flipSpin(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
}

@parentResource(Widget)
model Flange is ProxyResource<FlangeProperties> {
  @doc("The name of the flange")
  @key("flangeName")
  @segment("flanges")
  @path
  @visibility("read")
  name: string;
}

@doc("The properties of a Flange")
model FlangeProperties {
  @doc("The description of the flange")
  description: string;

  @doc("The weight in ounces of the flange")
  weight: safeint;

  ...DefaultProvisioningStateProperty;
}

#suppress "deprecated" "Should replace TenantResourceDelete in the future"
@armResourceOperations(Flange)
interface Flanges
  extends TenantResourceCreate<Flange>,
    TenantResourceDelete<Flange>,
    TenantResourceRead<Flange>,
    TenantResourceListByParent<Flange> {
  @autoRoute
  @action
  @doc("Add a certain amount to the weight")
  @post
  @armResourceAction(Flange)
  increaseWeight(
    ...TenantInstanceParameters<Flange>,

    @doc("The request body.")
    @body
    increment: safeint,
  ): ArmNoContentResponse<"Weight added successfully"> | ErrorResponse;
}
