import "@typespec/http";
import "@typespec/rest";

import "./questionanswering-authoring_models.tsp";

@useAuth(
  ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
    {
      type: OAuth2FlowType.implicit,
      authorizationUrl: "https://login.contoso.com/common/oauth2/v2.0/authorize",
      scopes: ["https://cognitiveservices.azure.com/.default"],
    }
  ]>
)
@service({
  title: "Hello world",
  version: "0.1.0",
})
namespace Azure.Language.QnA; //@route("")  // TODO

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Rest.Resource;
using TypeSpec.OpenAPI;

@doc("")
@route("/projects/{projectName}")
namespace Hello {
  @post
  op CreateExport(...ProjectNamePathParameter): JobState;
}

interface Projects
  extends ResourceList<ProjectMetadata, ODataError>,
    ResourceRead<ProjectMetadata, ODataError>,
    ResourceDelete<ProjectMetadata, ODataError>,
    ResourceUpdate<ProjectMetadata, ODataError> {
  @extension("x-ms-long-running-operation", true)
  @post
  CreateExport(
    ...ResourceParameters<ProjectMetadata>,
    ...AssetKindParameter,
  ): Body<""> | ODataError; // TODO: capture LRO status

  @route("feedback")
  @post
  feedback(
    ...ResourceParameters<ProjectMetadata>,
    @body feedback: ActiveLearningFeedback,
  ): ActiveLearningFeedback | ODataError;
}

// TODO: Switch to CreateOrUpdate
interface Deployments
  extends ResourceCreate<ProjectDeployment, ODataError>,
    ResourceList<ProjectDeployment, ODataError> {
  // TODO extension resource for multi-parents
  @get
  @route("{projectName}/jobs/{jobId}")
  GetJob(...ResourceParameters<QnaSourceRecord>, ...JobIdParameter): JobState | ODataError;
}

interface Synonyms
  extends ResourceCreate<SynonymAsset, ODataError>,
    ResourceList<SynonymAsset, ODataError> {}

interface Sources
  extends ResourceUpdate<QnaSourceRecord, ODataError>,
    ResourceList<QnaSourceRecord, ODataError> {
  // TODO: Singleton Resource not represented correctly
  @get
  @route("{projectName}/sources/jobs/{jobId}")
  GetJob(...ResourceParameters<QnaSourceRecord>, ...JobIdParameter): JobState | ODataError;
}

interface Qnas extends ResourceCreate<QnaRecord, ODataError>, ResourceList<QnaRecord, ODataError> {
  @get
  @route("{projectName}/qnas/jobs/{jobId}")
  GetJob(...ResourceParameters<QnaRecord>, ...JobIdParameter): JobState | ODataError;
}
