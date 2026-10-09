import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Spector;

@armProviderNamespace("Microsoft.ServiceGroupExtension")
@service
@versioned(Versions)
@doc("Arm Resource Provider service group API.")
namespace Azure.ResourceManager.ServiceGroupExtension;

@doc("Azure API versions.")
enum Versions {
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  @doc("Preview API version 2023-12-01-preview.")
  v2023_12_01_preview: "2023-12-01-preview",
}

union ProvisioningState {
  ResourceProvisioningState,
  Provisioning: "Provisioning",
  Updating: "Updating",
  Deleting: "Deleting",
  Accepted: "Accepted",
}

model ServiceGroupExtensionResource is ExtensionResource<ServiceGroupExtensionResourceProperties> {
  ...ResourceNameParameter<ServiceGroupExtensionResource>;
}

/** ServiceGroupExtensionResource properties */
model ServiceGroupExtensionResourceProperties {
  @doc("The description of the resource.")
  description?: string;

  /** The status of the last operation. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The interface of extension resources scoped to service groups */
@armResourceOperations
interface ServiceGroupExtensionResources {
  @scenario
  @scenarioDoc("""
    Resource GET operation at service group scope.
    Expected path: /providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource
    Expected query parameter: api-version=2023-12-01-preview
    Expected response body:
    ```json
    {
      "id": "/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource",
      "name": "resource",
      "type": "Microsoft.ServiceGroupExtension/serviceGroupExtensionResources",
      "properties":{
        "description": "valid",
        "provisioningState": "Succeeded"
      },
      "systemData": {
        "createdBy": "AzureSDK",
        "createdByType": "User",
        "createdAt": <any date>,
        "lastModifiedBy": "AzureSDK",
        "lastModifiedAt": <any date>,
        "lastModifiedByType": "User"
      }
    }
    ```
    """)
  get is Extension.Read<Extension.ServiceGroup<"serviceGroupId">, ServiceGroupExtensionResource>;

  @scenario
  @scenarioDoc("""
    Resource PUT operation at service group scope.
    Expected path: /providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "properties":{
        "description": "valid"
      }
    }
    ```
    Expected response body:
    ```json
    {
      "id": "/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource",
      "name": "resource",
      "type": "Microsoft.ServiceGroupExtension/serviceGroupExtensionResources",
      "properties":{
        "description": "valid",
        "provisioningState": "Succeeded"
      },
      "systemData": {
        "createdBy": "AzureSDK",
        "createdByType": "User",
        "createdAt": <any date>,
        "lastModifiedBy": "AzureSDK",
        "lastModifiedAt": <any date>,
        "lastModifiedByType": "User"
      }
    }
    ```
    """)
  createOrUpdate is Extension.CreateOrReplaceAsync<
    Extension.ServiceGroup<"serviceGroupId">,
    ServiceGroupExtensionResource
  >;

  @scenario
  @scenarioDoc("""
    Resource PATCH operation at service group scope.
    Expected path: /providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "properties":{
        "description": "valid2"
      }
    }
    ```
    Expected response body:
    ```json
    {
      "id": "/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource",
      "name": "resource",
      "type": "Microsoft.ServiceGroupExtension/serviceGroupExtensionResources",
      "properties":{
        "description": "valid2",
        "provisioningState": "Succeeded"
      },
      "systemData": {
        "createdBy": "AzureSDK",
        "createdByType": "User",
        "createdAt": <any date>,
        "lastModifiedBy": "AzureSDK",
        "lastModifiedAt": <any date>,
        "lastModifiedByType": "User"
      }
    }
    ```
    """)
  update is Extension.CustomPatchSync<
    Extension.ServiceGroup<"serviceGroupId">,
    ServiceGroupExtensionResource,
    ServiceGroupExtensionResource
  >;

  @scenario
  @scenarioDoc("""
    Resource DELETE operation at service group scope.
    Expected path: /providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 204
    """)
  delete is Extension.DeleteSync<
    Extension.ServiceGroup<"serviceGroupId">,
    ServiceGroupExtensionResource
  >;

  @scenario
  @scenarioDoc("""
    Resource LIST operation at service group scope.
    Expected path: /providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources
    Expected query parameter: api-version=2023-12-01-preview
    Expected response body:
    ```json
    {
      "value": [{
        "id": "/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource",
        "name": "resource",
        "type": "Microsoft.ServiceGroupExtension/serviceGroupExtensionResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User"
        }
      }]
    }
    ```
    """)
  listByServiceGroup is Extension.ListByTarget<
    Extension.ServiceGroup<"serviceGroupId">,
    ServiceGroupExtensionResource
  >;
}
