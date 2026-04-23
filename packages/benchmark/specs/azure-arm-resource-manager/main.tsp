import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;

/** Contoso Benchmark Resource Provider. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubBenchmark" })
@versioned(Versions)
namespace Microsoft.ContosoBenchmark;

enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  @previewVersion
  `2024-01-01-preview`,
}

// --- Tracked Resource: VirtualMachine ---

model VirtualMachine is TrackedResource<VirtualMachineProperties> {
  ...ResourceNameParameter<VirtualMachine>;
}

model VirtualMachineProperties {
  vmSize?: string;
  osType?: OsType;
  imageReference?: ImageReference;
  networkProfile?: NetworkProfile;
  storageProfile?: StorageProfile;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

union OsType {
  string,
  Windows: "Windows",
  Linux: "Linux",
}

model ImageReference {
  publisher: string;
  offer: string;
  sku: string;
  version: string;
}

model NetworkProfile {
  subnetId: string;
  publicIpEnabled: boolean;
  networkSecurityGroupId?: string;
}

model StorageProfile {
  osDiskSizeGb: int32;
  dataDisks?: DataDisk[];
}

model DataDisk {
  name: string;
  sizeGb: int32;
  diskType: DiskType;
}

union DiskType {
  string,
  Standard: "Standard",
  Premium: "Premium",
  UltraSSD: "UltraSSD",
}

// --- Proxy Resource: Disk ---

@parentResource(VirtualMachine)
model Disk is ProxyResource<DiskProperties> {
  ...ResourceNameParameter<Disk>;
}

model DiskProperties {
  sizeGb: int32;
  diskType: DiskType;
  iops?: int32;
  throughputMbps?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

// --- Tracked Resource: Network ---

model VirtualNetwork is TrackedResource<VirtualNetworkProperties> {
  ...ResourceNameParameter<VirtualNetwork>;
}

model VirtualNetworkProperties {
  addressPrefixes: string[];
  subnets?: Subnet[];
  enableDdosProtection?: boolean;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Subnet {
  name: string;
  addressPrefix: string;
  networkSecurityGroupId?: string;
}

// --- Tracked Resource: Storage Account ---

model StorageAccount is TrackedResource<StorageAccountProperties> {
  ...ResourceNameParameter<StorageAccount>;
}

model StorageAccountProperties {
  sku: StorageSku;
  kind: StorageKind;
  accessTier?: AccessTier;
  enableHttpsTrafficOnly?: boolean;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

union StorageSku {
  string,
  Standard_LRS: "Standard_LRS",
  Standard_GRS: "Standard_GRS",
  Premium_LRS: "Premium_LRS",
}

union StorageKind {
  string,
  StorageV2: "StorageV2",
  BlobStorage: "BlobStorage",
  FileStorage: "FileStorage",
}

union AccessTier {
  string,
  Hot: "Hot",
  Cool: "Cool",
  Archive: "Archive",
}

// --- Operations ---

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface VirtualMachines {
  get is ArmResourceRead<VirtualMachine>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<VirtualMachine>;
  update is ArmCustomPatchSync<
    VirtualMachine,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<VirtualMachine, VirtualMachineProperties>
  >;
  delete is ArmResourceDeleteAsync<VirtualMachine>;
  listByResourceGroup is ArmResourceListByParent<VirtualMachine>;
  listBySubscription is ArmListBySubscription<VirtualMachine>;

  restart is ActionAsync<VirtualMachine, {}, {}>;
  powerOff is ActionAsync<VirtualMachine, {}, {}>;
  checkExistence is ArmResourceCheckExistence<VirtualMachine>;
}

@armResourceOperations
interface Disks {
  get is ArmResourceRead<Disk>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Disk>;
  delete is ArmResourceDeleteAsync<Disk>;
  list is ArmResourceListByParent<Disk>;
}

@armResourceOperations
interface VirtualNetworks {
  get is ArmResourceRead<VirtualNetwork>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<VirtualNetwork>;
  update is ArmCustomPatchSync<
    VirtualNetwork,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<VirtualNetwork, VirtualNetworkProperties>
  >;
  delete is ArmResourceDeleteAsync<VirtualNetwork>;
  listByResourceGroup is ArmResourceListByParent<VirtualNetwork>;
  listBySubscription is ArmListBySubscription<VirtualNetwork>;
}

@armResourceOperations
interface StorageAccounts {
  get is ArmResourceRead<StorageAccount>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<StorageAccount>;
  update is ArmCustomPatchSync<
    StorageAccount,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<StorageAccount, StorageAccountProperties>
  >;
  delete is ArmResourceDeleteAsync<StorageAccount>;
  listByResourceGroup is ArmResourceListByParent<StorageAccount>;
  listBySubscription is ArmListBySubscription<StorageAccount>;
}
