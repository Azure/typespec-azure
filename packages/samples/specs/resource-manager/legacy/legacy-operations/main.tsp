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
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2021-10-01-preview`,
}

/** A best practice resource */
model BestPractice is Azure.ResourceManager.ProxyResource<BestPracticeProperties> {
  ...ResourceNameParameter<
    Resource = BestPractice,
    KeyName = "bestPracticeName",
    SegmentName = "bestPractices",
    NamePattern = ""
  >;
}

/** Resource-specific properties of a best practice resource */
model BestPracticeProperties {
  ...DefaultProvisioningStateProperty;

  /** The description of the best practice */
  description: string;
}

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator" "Resource template"
interface BestPracticeOps
  extends Azure.ResourceManager.Legacy.LegacyOperations<
      {
        ...ApiVersionParameter,
        ...Azure.ResourceManager.Legacy.Provider,
      },
      {
        /** The name of the best practice */
        @segment("bestPractices")
        @key
        @path
        bestPracticeName: string,
      }
    > {}

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator" "Resource template"
interface BestPracticesVersionOps
  extends Azure.ResourceManager.Legacy.LegacyOperations<
      {
        ...ApiVersionParameter,
        ...Azure.ResourceManager.Legacy.Provider,

        /** The name of the best practice */
        @segment("bestPractices")
        @key
        @path
        bestPracticeName: string,
      },
      {
        /** The name of the version */
        @segment("versions")
        @key
        @path
        versionName: string,
      }
    > {}

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
