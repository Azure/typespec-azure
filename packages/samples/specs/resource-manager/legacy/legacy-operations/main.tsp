import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;

/** Contoso Resource Provider management API. */
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint" ""
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2021-10-01-preview`,
}

/** Standard operation list */
interface Operations extends Azure.ResourceManager.Operations {}

/** A best practice resource */
#suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "For sample purpose"
model BestPractice is Azure.ResourceManager.ProxyResource<BestPracticeProperties> {
  ...ResourceNameParameter<
    Resource = BestPractice,
    KeyName = "bestPracticeName",
    SegmentName = "bestPractices",
    NamePattern = ""
  >;
  ...Legacy.ExtendedLocationOptionalProperty;
}

/** Resource-specific properties of a best practice resource */
model BestPracticeProperties {
  ...DefaultProvisioningStateProperty;

  /** The description of the best practice */
  description: string;
}

alias BestPracticeOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  },
  {
    /** The name of the best practice */
    @segment("bestPractices")
    @key
    @path
    bestPracticeName: string;
  }
>;

alias BestPracticesVersionOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...Azure.ResourceManager.Legacy.Provider;

    /** The name of the best practice */
    @segment("bestPractices")
    @key
    @path
    bestPracticeName: string;
  },
  {
    /** The name of the version */
    @segment("versions")
    @key
    @path
    versionName: string;
  }
>;

/** Best practice operations */
@armResourceOperations
interface BestPractices {
  get is BestPracticeOps.Read<BestPractice>;
  createOrUpdate is BestPracticeOps.CreateOrUpdateSync<BestPractice>;
  update is BestPracticeOps.CustomPatchSync<
    BestPractice,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<BestPractice, BestPracticeProperties>
  >;
  delete is BestPracticeOps.DeleteSync<BestPractice>;
  listByTenant is BestPracticeOps.List<BestPractice>;
}

/** Child best practice version operations */
@armResourceOperations
interface BestPracticeVersions {
  get is BestPracticesVersionOps.Read<BestPractice>;
  createOrUpdate is BestPracticesVersionOps.CreateOrUpdateSync<BestPractice>;
  update is BestPracticesVersionOps.CustomPatchSync<
    BestPractice,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<BestPractice, BestPracticeProperties>
  >;
  delete is BestPracticesVersionOps.DeleteSync<BestPractice>;
  listByTenant is BestPracticesVersionOps.List<BestPractice>;
}
