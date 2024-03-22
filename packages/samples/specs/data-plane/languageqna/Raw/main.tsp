import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-autorest";
import "./common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.Core.Traits;
using Autorest;
using TypeSpec.OpenAPI;
// using Azure.QnAMaker.Common;

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
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
  title: "Microsoft Cognitive Language Service - Question Answering - Authoring",
})
@useDependency(Azure.Core.Versions.v1_0_Preview_2)
namespace Azure.QnAMaker;

alias ServiceTraits = NoRepeatableRequests & NoConditionalRequests & NoClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

@doc("The API key header definition.")
model ApiKey {
  @doc("Service connection key")
  @header("Ocp-Apim-Subscription-Key")
  ocpApimSubscriptionKey: string;
}

@doc("Collection of error types")
model Errors {
  @doc("The error list.")
  errors: Azure.Core.Foundations.Error[];
}

@useDependency(Azure.Core.Versions.v1_0_Preview_2)
@route("/query-knowledgebases")
namespace QuestionAnsweringProjects {
  @doc("Gets all projects for a user")
  op listProjects is Operations.ResourceList<
    ProjectMetadata,
    ListQueryParametersTrait<StandardListQueryParameters>
  >;

  @doc("Get the requested project metadata")
  op getProjectDetails is Operations.ResourceRead<ProjectMetadata>;

  @doc("Create or update a project")
  op createProject is Operations.ResourceCreateOrUpdate<ProjectMetadata>;

  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Delete the project")
  op deleteProject is Operations.LongRunningResourceDelete<ProjectMetadata>;

  @doc("Gets the status of a Project delete job")
  op getDeleteStatus is Operations.ResourceRead<DeletionJobState>;

  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Export project metadata and assets")
  @extension("x-ms-long-running-operation", true)
  @action("export")
  @actionSeparator("/:")
  op export is Operations.ResourceAction<
    ProjectMetadata,
    ImportExportFormatParameter & AssetKindParameter,
    AcceptedResponse & Azure.Core.Foundations.LongRunningStatusLocation
  >;

  @doc("Gets the status of an Export job, once job completes, returns the project metadata, and assets")
  op getExportStatus is Operations.ResourceRead<ExportJobState>;

  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Import project assets")
  @extension("x-ms-long-running-operation", true)
  @action("import")
  @actionSeparator("/:")
  op `import` is Operations.ResourceAction<
    ProjectMetadata,
    ImportExportFormatParameter & AssetKindParameter,
    AcceptedResponse & Azure.Core.Foundations.LongRunningStatusLocation
  >;

  @doc("Gets the status of an Import job")
  op getImportStatus is Operations.ResourceRead<JobState>;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Deploy project to production.")
  @put
  op createDeployment is Azure.Core.Foundations.ResourceOperation<
    ProjectDeployment,
    {},
    AcceptedResponse & Azure.Core.Foundations.LongRunningStatusLocation
  >;

  @doc("List all deployments of a project.")
  op listDeployments is Operations.ResourceList<ProjectDeployment>;

  @doc("Gets the status of a Deploy job.")
  @get
  op getDeploymentsJobStatus is Operations.ResourceRead<DeploymentJobState>;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("List all the synonyms of a project.")
  @get
  @route("projects/{projectName}/deployments/synonyms")
  op listSynonyms is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;
      ...StandardListQueryParameters;
    },
    Azure.Core.Page<SynonymAsset>
  >;

  #suppress "@azure-tools/typespec-azure-core/request-body-problem" "This is an existing service that cannot be changed."
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("Create or update all the synonyms of a project.")
  @put
  @route("projects/{projectName}/deployments/synonyms")
  op replaceSynonyms is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;

      @doc("The request body.")
      @body
      body: SynonymAsset[];
    },
    Azure.Core.Page<SynonymAsset>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("List all the sources of a project.")
  @get
  @route("projects/{projectName}/sources")
  op listSources is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;
      ...StandardListQueryParameters;
    },
    Azure.Core.Page<QnaSourceRecord>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("Updates the sources of a project.")
  @patch
  @route("projects/{projectName}/sources")
  op updateSources is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;

      @doc("The request body.")
      @body
      body: UpdateRecord<QnaSourceRecord>;
    },
    Azure.Core.Page<QnaSourceRecord>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("Gets the status of update sources job.")
  @get
  @route("projects/{projectName}/sources/jobs/{jobId}")
  op getSourcesJobStatus is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;
      ...JobIdParameter;
    },
    JobMetadata
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("List all the sources of a project.")
  @get
  @route("projects/{projectName}/qnas")
  op listQuestionAndAnswers is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;
      ...StandardListQueryParameters;
    },
    Azure.Core.Page<QnaSourceRecord>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("Updates the sources of a project.")
  @patch
  @route("projects/{projectName}/qnas")
  op updateQuestionAndAnswers is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;

      @doc("The request body.")
      @body
      body: UpdateRecord<QnaRecord>;
    },
    Azure.Core.Page<QnaSourceRecord>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("Gets the status of update sources job.")
  @get
  @route("projects/{projectName}/qnas/jobs/{jobId}")
  op getQuestionAndAnswersJobStatus is Azure.Core.Foundations.Operation<
    {
      ...ProjectNamePathParameter;
      ...JobIdParameter;
    },
    JobMetadata
  >;

  @post
  @doc("Update Active Learning feedback.")
  @action("feedback")
  @actionSeparator("/")
  op createFeedback is Operations.ResourceAction<ProjectMetadata, {}, NoContentResponse>;
}

// Model definitions

@resource("projects")
@doc("Represents the project")
model ProjectMetadata {
  @key
  @doc("Name of the project")
  @visibility("read")
  projectName: string;

  @doc("Description of the project.")
  description: string;
}

@doc("Parameters needed to create the project")
model CreateProjectOptions {
  @doc("Description of the project")
  description?: string;

  ...Language;

  @doc("Resource enabled for multiple languages across projects or not")
  multilingualResource?: boolean;

  @doc("Configurable settings of the Project")
  settings?: ProjectSettings;
}

@doc("Configurable settings of the Project")
model ProjectSettings {
  @doc("Default Answer response when no good match is found in the knowledge base")
  defaultAnswer?: string;
}

@doc("Represents the job metadata")
model JobMetadata {
  @key
  @doc("The job ID.")
  @visibility("read")
  jobId: string;

  @doc("When the job was created.")
  createdDateTime: utcDateTime;

  @doc("When the job expires.")
  expirationDateTime?: utcDateTime;

  @doc("When the job was last updated.")
  lastUpdatedDateTime: utcDateTime;

  @doc("The job status.")
  status: JobStatus;
}

@doc("The job status.")
enum JobStatus {
  @doc("The job has not started yet.")
  notStarted,

  @doc("The job is running.")
  running,

  @doc("The job has completed successfully.")
  succeeded,

  @doc("The job has failed.")
  failed,

  @doc("The job has been cancelled.")
  cancelled,

  @doc("The job is cancelling.")
  cancelling,

  @doc("The job is partially completed.")
  partiallyCompleted,
}

@doc("Job state represents the job metadata and any errors")
@resource("import/jobs")
@parentResource(ProjectMetadata)
model JobState {
  ...JobMetadata;
  ...Errors;
}

@doc("URL to download the result of the Export Job")
model ExportJobResultUrl {
  @doc("URL to download the result of the Export Job")
  resultUrl: string;
}

@doc("Export job status, project metadata, and assets.")
@resource("export/jobs")
@parentResource(ProjectMetadata)
model ExportJobState {
  ...JobState;
  ...ExportJobResultUrl;
}

@doc("The state of a deletion job.")
@resource("projects/deletion-jobs")
model DeletionJobState {
  ...JobState;
}

@resource("deployments")
@parentResource(ProjectMetadata)
@doc("Project deployment details.")
model ProjectDeployment {
  @key
  @doc("Name of the deployment.")
  @visibility("read")
  deploymentName: string;

  @doc("Represents the project last deployment date-time.")
  lastDeployedDateTime?: utcDateTime;
}

@doc("Job state represents the job metadata and any errors")
@resource("jobs")
@parentResource(ProjectDeployment)
model DeploymentJobState {
  ...JobMetadata;
  ...Errors;
}

@doc("Collection of synonyms.")
model SynonymAsset is WordAlterations;

@doc("Collection of word alterations.")
model WordAlterations {
  @doc("Collection of word alterations.")
  alterations: string[];
}

@doc("Custom source record with last updated date-time.")
model QnaSourceRecord {
  ...QnaSourceMetadata;

  @doc("The time of the last deployment.")
  lastDeployedDateTime?: utcDateTime;
}

@doc("Input source file or url details.")
model QnaSourceMetadata {
  @doc("Friendly name of the Source.")
  displayName?: string;

  @doc("Unique source identifier. Name of the file if it's a 'file' source; otherwise, the complete URL if it's a 'url' source.")
  source?: string;

  @doc("URI location for the file or url.")
  sourceUri: string;

  @doc("The source kind.")
  sourceKind: QnaSourceKind;

  @doc("The content structure kind.")
  contentStructureKind: SourceContentStructureKind;
}

@doc("Supported source types.")
enum QnaSourceKind {
  @doc("File source")
  file,

  @doc("Url source")
  url,
}

@doc("Content structure type for sources.")
enum SourceContentStructureKind {
  @doc("The source content is unstructured")
  unstructured,
}

@friendlyName("{name}UpdateRecord", Value)
model UpdateRecord<Value> {
  updateOperation: UpdateOperationKind;
  value: Value;
}

@doc("Update source record.")
model UpdateQnaSourceRecord {
  ...QnaSourceMetadata;

  @doc("Boolean flag used to refresh data from the Source.")
  refreshSourceOptions: boolean;
}

@doc("The kind of an update operation.")
enum UpdateOperationKind {
  @doc("Addition operation")
  add,

  @doc("Deletion operation")
  delete,

  @doc("Replace operation")
  replace,
}

@doc("Question and answer record")
model QnaRecord {
  @doc("The record ID.")
  id: int32;

  @doc("The answer.")
  answer: string;

  @doc("The source.")
  source: string;

  @doc("The questions.")
  questions: string[];

  @doc("The metadata.")
  metadata: string;

  @doc("The dialog.")
  dialog: QnaDialog;

  @doc("The active learning suggestions.")
  activeLearningSuggestions: SuggestedQuestionsCluster;
}

@doc("The details of a suggested questions cluster.")
model SuggestedQuestionsCluster {
  @doc("Active Learning suggested questions cluster details.")
  clusterHead: string;

  @doc("List of all suggested questions for the QnA.")
  suggestedQuestions: SuggestedQuestion;
}

@doc("A dialog to be displayed to the user.")
model QnaDialog {
  @doc("If true, is context only.")
  isContextOnly: boolean;

  @doc("The prompts to display.")
  prompts: QnaPrompt[];
}

@doc("Details of a QnA prompt.")
model QnaPrompt {
  @doc("The display order.")
  displayOrder: int16;

  @doc("The QnA ID.")
  qnaId: int32;

  @doc("The QnA record.")
  qna: QnaRecord;

  @doc("The display text.")
  displayText: string;
}

@doc("Question suggested by the Active Learning feature.")
model SuggestedQuestion {
  @doc("Question suggested by the Active Learning feature.")
  question: string;

  @doc("The number of times the question was suggested explicitly by the user.")
  userSuggestedCount: int32;

  @doc("The number of times the question was suggested automatically by the Active Learning algorithm.")
  autoSuggestedCount: int32;
}

@doc("The active learning feedback.")
model ActiveLearningFeedback {
  @doc("A list of Feedback Records for Active Learning.")
  records?: FeedbackRecord[];
}

@doc("A feedback record.")
model FeedbackRecord {
  @doc("Unique identifier of the user.")
  userId?: string;

  @doc("User suggested question for the QnA.")
  userQuestion?: string;

  @doc("Unique ID of the QnA.")
  qnaId?: int32;
}
