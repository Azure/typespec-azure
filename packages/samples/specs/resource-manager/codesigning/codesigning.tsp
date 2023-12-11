import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@armProviderNamespace
@service({
  title: "CodeSigningManagementClient",
  version: "2020-12-14-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@doc("Code Sign Resource Provider Account and Certificate Profile management API.")
namespace Microsoft.CodeSigning;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A CodeSignAccount resource")
model CodeSignAccount is TrackedResource<CodeSignAccountProperties> {
  @doc("Code Signing account name")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @key("accountName")
  @segment("codeSignAccounts")
  @path
  name: string;
}

@armResourceOperations
interface CodeSignAccounts
  extends TrackedResourceOperations<CodeSignAccount, CodeSignAccountProperties> {}

#suppress "@azure-tools/typespec-azure-resource-manager/empty-updateable-properties" "This is an existing service that cannot be changed."
@doc("Properties of the code sign account")
model CodeSignAccountProperties {
  @visibility("read")
  @doc("The URI of the code sign account for performing operations on certificate profiles. This property is readonly")
  accountUri?: string;

  @visibility("read")
  @doc("Indicates whether the account has been verified.")
  verificationStatus?: VerificationStatus;

  @visibility("read")
  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

@doc("Object containing updates for patch operations")
model CodeSignAccountPatch {
  @doc("Resource tags.")
  tags: {};
}

@doc("Current verification information.")
enum VerificationStatus {
  @doc("Verification is completed.")
  Completed,

  @doc("Verification is in progress.")
  InProgress,

  @doc("Verification is not completed.")
  NotCompleted,
}

@doc("The rotation policy for the profile.")
enum RotationPolicy {
  @doc("Monthly rotation policy.")
  Monthly,
}

@doc("The type of the profile.")
enum ProfileType {
  @doc("Test profile.")
  Test,

  @doc("Trial profile.")
  Trial,

  @doc("Private trust profile.")
  PrivateTrust,

  @doc("Public trust profile.")
  PublicTrust,
}

@doc("The status of the current operation.")
@Azure.Core.lroStatus
enum ProvisioningState {
  ...ResourceProvisioningState,

  @doc("The resource is being provisioned.")
  Provisioning,

  @doc("The resource is updating.")
  Updating,

  @doc("The resource is being deleted.")
  Deleting,

  @doc("The resource create request has been accepted.")
  Accepted,
}

@parentResource(CodeSignAccount)
model CertificateProfile is ProxyResource<CertificateProfileProperties> {
  @doc("Certificate profile name")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @key("profileName")
  @segment("certificateProfiles")
  @path
  name: string;
}

@armResourceOperations
interface CertificateProfiles
  extends ResourceRead<CertificateProfile>,
    ResourceUpdate<CertificateProfile, CertificateProfileProperties>,
    ResourceListByParent<CertificateProfile> {}

@doc("Properties of the certificate profile")
model CertificateProfileProperties {
  @doc("The kind of certificate profile represented.")
  profileType: ProfileType;

  @doc("The certificate rotation policy.")
  rotationPolicy: RotationPolicy;

  @doc("Name of the certificate")
  commonName: string;

  @visibility("read")
  @doc("Certificate authority of the certificate")
  authority?: string;

  @doc("Subject Alternative Name of the certificate")
  subjectAlternativeName: string;

  @visibility("read")
  @doc("The certificate organization.")
  organization?: string;

  @visibility("read")
  @doc("The street address of the entity the certificate was issued to.")
  streetAddress?: string;

  @visibility("read")
  @doc("The city of the entity the certificate was issued to.")
  city?: string;

  @visibility("read")
  @doc("The state of the entity the certificate was issued to.")
  state?: string;

  @visibility("read")
  @doc("The country of the entity the certificate was issued to.")
  country?: string;

  // TODO: Flatten?

  @visibility("read")
  @doc("The set of certificates associated with this profile.")
  certificates?: Certificate[];

  @visibility("read")
  @doc("The provisioning state of the certificate.")
  provisioningState?: ProvisioningState;
}

@doc("Properties of the certificate")
model Certificate {
  @doc("Id of the certificate")
  @visibility("read")
  id?: string;

  @doc("Subject name of the certificate")
  @visibility("read")
  subjectName?: string;

  @doc("Subject alternative name of the certificate")
  @visibility("read")
  subjectAlternativeName?: string;

  @doc("Thumbprint of the certificate")
  @visibility("read")
  thumbprint?: string;

  @doc("Certificate created date")
  @visibility("read")
  createdDate?: string;

  @doc("Certificate expiry date")
  @visibility("read")
  expiryDate?: string;
}
