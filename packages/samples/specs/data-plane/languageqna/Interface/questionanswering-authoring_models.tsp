import "./common.tsp";

using TypeSpec.Rest;
using TypeSpec.Rest.Resource;

model ActiveLearningFeedback {
  @doc("A list of Feedback Records for Active Learning.")
  records?: FeedbackRecord[];
}

model FeedbackRecord {
  @doc("Unique identifier of the user.")
  userId?: string;

  @doc("User suggested question for the QnA.")
  userQuestion?: string;

  @doc("Unique ID of the QnA.")
  qnaId?: int32;
}

model ProjectMetadata {
  @doc("Name of the project.")
  @key
  @segment("projects")
  projectName: string;

  @doc("Description of the project.")
  description?: string;

  language?: Language;

  @doc("Resource enabled for multiple languages across projects or not.")
  multilingualResource?: boolean;

  settings?: ProjectSettings;

  @doc("Project creation date-time.")
  createdDateTime?: string;

  @doc("Represents the project last modified date-time.")
  lastModifiedDateTime?: string;

  @doc("Represents the project last deployment date-time.")
  lastDeployedDateTime?: string;
}

model ProjectSettings {
  @doc("Default Answer response when no good match is found in the knowledge base.")
  defaultAnswer?: string;
}

@parentResource(ProjectMetadata)
model ProjectDeployment {
  @doc("Name of the deployment.")
  @key
  @segment("deployments")
  deploymentName: string;

  @doc("Represents the project last deployment date-time.")
  lastDeployedDateTime?: string;
}

alias stringArray = string[];

model SynonymAsset is WordAlterations;

@parentResource(ProjectMetadata)
model WordAlterations {
  @doc("Collection of word alterations.")
  @segment("synonym")
  @key
  alterations: string[];
}

@doc("Source to be updated.")
model UpdateSourceRecord {
  updateOperation: UpdateOperationKind;
  newValue: UpdateQnaSourceRecord;
}

@doc("Update source record.")
model UpdateQnaSourceRecord {
  ...QnaSourceMetadata;

  @doc("Boolean flag used to refresh data from the Source.")
  refreshSourceOptions: boolean;
}

@doc("Custom source record with last updated date-time.")
@parentResource(ProjectMetadata)
model QnaSourceRecord {
  ...QnaSourceMetadata;
  ...LastUpdatedDateTime;
}

@doc("Input source file or url details.")
model QnaSourceMetadata {
  @doc("Friendly name of the Source.")
  displayName?: string;

  @doc("Unique source identifier. Name of the file if it's a 'file' source; otherwise, the complete URL if it's a 'url' source.")
  @segment("sources")
  @key
  source: string;

  @doc("URI location for the file or url.")
  sourceUri: string;

  sourceKind: QnaSourceKind;
  contentStructureKind: SourceContentStructureKind;
}

@doc("Supported source types.")
enum QnaSourceKind {
  file,
  url,
}

@doc("Content structure type for sources.")
enum SourceContentStructureKind {
  unstructured,
}

@doc("Last updated date-time parameter.")
model LastUpdatedDateTime {
  @doc("Date-time when the QnA was last updated.")
  lastUpdatedDateTime: utcDateTime;
}

@doc("Represents the job metadata.") // TODO extension resource
model JobMetaData {
  jobId: string;
  createdDateTime: utcDateTime;
  lastUpdatedDateTime: utcDateTime;
  expirationDateTime?: utcDateTime;
  status: JobStatus;
}

@doc("Job state represents the job metadata and any errors.")
model JobState {
  ...JobMetaData;

  @doc("Collection of Error types.")
  errors: Error[];
}

@doc("Job status.")
enum JobStatus {
  notStarted,
  running,
  succeeded,
  failed,
  cancelled,
  cancelling,
  partiallyCompleted,
}

enum UpdateOperationKind {
  add,
  delete,
  replace,
}

model UpdateQnaRecord {
  updateOperation: UpdateOperationKind;
  value: QnaRecord;
}

@parentResource(ProjectMetadata)
model QnaRecord {
  @segment("qnas")
  @key
  id: int32;

  answer: string;
  source: string;
  questions: string[];
  metadata: string;
  dialog: QnaDialog;
  activeLearningSuggestions: SuggestedQuestionsCluster;
}

model QnaDialog {
  isContextOnly: boolean;
  prompts: QnaPrompt[];
}

model QnaPrompt {
  displayOrder: int16;
  qnaId: int32;
  qna: QnaRecord;
  displayText: string;
}

model SuggestedQuestionsCluster {
  clusterHead: string;
  suggestedQuestions: SuggestedQuestion;
}

model SuggestedQuestion {
  question: string;
  userSuggestedCount: int32;
  autoSuggestedCount: int32;
}

model ImportJobOptions {
  metadata: CreateProjectOptions;
  assets: Asset[];
  fileUri: string;
}

model Asset {
  synonyms?: SynonymAsset;
  qnas?: ImportQnaAsset;
}

model CreateProjectOptions {
  description?: string;
  language: Language;
  multilingualResource: boolean;
  settings: ProjectSettings[];
}

alias ImportQnaAsset = ImportQnaRecord;
model ImportQnaRecord {
  ...RetrieveQnaRecord;
  ...SourceDisplayNameParameter;
}

model RetrieveQnaRecord {}

model SourceDisplayNameParameter {}
