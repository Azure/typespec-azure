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

@armProviderNamespace
@service
@versioned(Versions)
@doc("Arm Resource Provider management API.")
namespace Azure.ResourceManager.ManagementGroup;

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

model MgmtGroupResource is ExtensionResource<MgmtGroupResourceProperties> {
  ...ResourceNameParameter<MgmtGroupResource>;
}

/** MgmtGroupResource properties */
model MgmtGroupResourceProperties {
  @doc("The description of the resource.")
  description?: string;

  /** The status of the last operation. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The interface of management group scoped resources */
@armResourceOperations
interface MgmtGroupResources {
  @scenario
  @scenarioDoc("""
    Resource GET operation at management group scope.
    Expected path: /providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource
    Expected query parameter: api-version=2023-12-01-preview
    
    Expected response body:
    ```json
    {
      "id": "/providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource",
      "name": "resource",
      "type": "Azure.ResourceManager.ManagementGroup/mgmtGroupResources",
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
  get is Extension.Read<Extension.ManagementGroup, MgmtGroupResource>;

  @scenario
  @scenarioDoc("""
    Resource PUT operation at management group scope.
    Expected path: /providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource
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
      "id": "/providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource",
      "name": "resource",
      "type": "Azure.ResourceManager.ManagementGroup/mgmtGroupResources",
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
  createOrUpdate is Extension.CreateOrReplaceAsync<Extension.ManagementGroup, MgmtGroupResource>;

  @scenario
  @scenarioDoc("""
    Resource PATCH operation at management group scope.
    Expected path: /providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource
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
      "id": "/providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource",
      "name": "resource",
      "type": "Azure.ResourceManager.ManagementGroup/mgmtGroupResources",
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
    Extension.ManagementGroup,
    MgmtGroupResource,
    MgmtGroupResource
  >;

  @scenario
  @scenarioDoc("""
    Resource DELETE operation at management group scope.
    Expected path: /providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 204
    """)
  delete is Extension.DeleteSync<Extension.ManagementGroup, MgmtGroupResource>;

  @scenario
  @scenarioDoc("""
    Resource LIST operation at management group scope.
    Expected path: /providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources
    Expected query parameter: api-version=2023-12-01-preview
    
    Expected response body:
    ```json
    {
      "value": [{
        "id": "/providers/Microsoft.Management/managementGroups/test-mg/providers/Azure.ResourceManager.ManagementGroup/mgmtGroupResources/resource",
        "name": "resource",
        "type": "Azure.ResourceManager.ManagementGroup/mgmtGroupResources",
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
  listByManagementGroup is Extension.ListByTarget<Extension.ManagementGroup, MgmtGroupResource>;
}
