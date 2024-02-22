import "@typespec/http";
import "@typespec/rest";

// cspell:ignore adls adlsgen

import "./dataIdentity.model.tsp";
import "./dataPolicy.model.tsp";

using TypeSpec.Rest;
using TypeSpec.Rest.Resource;
using TypeSpec.OpenAPI;

namespace Azure.SearchService;

model SearchIndexerDataSource {
  @doc("The name of the datasource.")
  @visibility("read")
  name: string;

  @doc("The description of the datasource.")
  description?: string;

  @doc("The type of the datasource.")
  type: SearchIndexerDataSourceType;

  @doc("Credentials for the datasource.")
  credentials: DataSourceCredentials;

  @doc("The data container for the datasource.")
  container: SearchIndexerDataContainer;

  @doc("An explicit managed identity to use for this datasource. If not specified and the connection string is a managed identity, the system-assigned managed identity is used. If not specified, the value remains unchanged. If ',none,' is specified, the value of this property is cleared.")
  identity?: SearchIndexerDataIdentity;

  @doc("The data change detection policy for the datasource.")
  dataChangeDetectionPolicy?: DataChangeDetectionPolicy;

  @doc("The data deletion detection policy for the datasource.")
  dataDeletionDetectionPolicy?: DataDeletionDetectionPolicy;

  ...ETag;

  @doc("A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your datasource definition when you want full assurance that no one, not even Microsoft, can decrypt your data source definition in Azure Cognitive Search. Once you have encrypted your data source definition, it will always remain encrypted. Azure Cognitive Search will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your datasource definition will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019.")
  encryptionKey?: SearchResourceEncryptionKey;
}

model SearchResourceEncryptionKey {
  @doc("The name of your Azure Key Vault key to be used to encrypt your data at rest.")
  @projectedName("json", "keyVaultKeyName")
  keyName: string;

  @doc("The version of your Azure Key Vault key to be used to encrypt your data at rest.")
  @projectedName("json", "keyVaultKeyVersion")
  keyVersion: string;

  @doc("The URI of your Azure Key Vault, also referred to as DNS name, that contains the key to be used to encrypt your data at rest. An example URI might be https://my-keyvault-name.vault.azure.net.")
  @projectedName("json", "keyVaultUri")
  vaultUri: string;

  @doc("Optional Azure Active Directory credentials used for accessing your Azure Key Vault. Not required if using managed identity instead.")
  accessCredentials?: AzureActiveDirectoryApplicationCredentials;

  @doc("An explicit managed identity to use for this encryption key. If not specified and the access credentials property is null, the system-assigned managed identity is used. On update to the resource, if the explicit identity is unspecified, it remains unchanged. If none is specified, the value of this property is cleared.")
  identity?: SearchIndexerDataIdentity;
}

model AzureActiveDirectoryApplicationCredentials {
  @doc("An AAD Application ID that was granted the required access permissions to the Azure Key Vault that is to be used when encrypting your data at rest. The Application ID should not be confused with the Object ID for your AAD Application.")
  applicationId?: string;

  @doc("The authentication key of the specified AAD application.")
  applicationSecret?: string;
}

enum SearchIndexerDataSourceType {
  @doc("Indicates an Azure SQL datasource.")
  AzureSql: "azuresql",

  @doc("Indicates a CosmosDB datasource.")
  CosmosDb: "cosmosdb",

  @doc("Indicates an Azure Blob datasource.")
  AzureBlob: "azureblob",

  @doc("Indicates an Azure Table datasource.")
  AzureTable: "azuretable",

  @doc("Indicates a MySql datasource.")
  MySql: "mysql",

  @doc("Indicates an ADLS Gen2 datasource.")
  AdlsGen2: "adlsgen2",
}

@doc("Represents credentials that can be used to connect to a datasource.")
model DataSourceCredentials {
  @doc("The connection string for the datasource. Set to '<unchanged>' if you do not want the connection string updated.")
  connectionString?: string;
}

@doc("Represents information about the entity (such as Azure SQL table or CosmosDB collection) that will be indexed.")
model SearchIndexerDataContainer {
  @doc("The name of the table or view (for Azure SQL data source) or collection (for CosmosDB data source) that will be indexed.")
  name: string;

  @doc("A query that is applied to this data container. The syntax and meaning of this parameter is datasource-specific. Not supported by Azure SQL datasources.")
  query?: string;
}

model SearchIndexer {
  @doc("The name of the indexer.")
  name: string;

  @doc("The description of the indexer.")
  description?: string;

  @doc("The name of the datasource from which this indexer reads data.")
  dataSourceName: string;

  @doc("The name of the skillset executing with this indexer.")
  skillsetName?: string;

  @doc("The name of the index to which this indexer writes data.")
  targetIndexName: string;

  @doc("The schedule for this indexer.")
  schedule?: IndexingSchedule;

  @doc("Parameters for indexer execution.")
  parameters?: IndexingParameters;

  @doc("Defines mappings between fields in the data source and corresponding target fields in the index.")
  fieldMappings?: FieldMapping;

  @doc("Output field mappings are applied after enrichment and immediately before indexing.")
  outputFieldMappings?: FieldMapping;

  @doc("A value indicating whether the indexer is disabled. Default is false.")
  disabled?: boolean = false;

  ...ETag;

  @doc("A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your indexer definition (as well as indexer execution status) when you want full assurance that no one, not even Microsoft, can decrypt them in Azure Cognitive Search. Once you have encrypted your indexer definition, it will always remain encrypted. Azure Cognitive Search will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your indexer definition (and indexer execution status) will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019.")
  encryptionKey?: SearchResourceEncryptionKey;

  @doc("Adds caching to an enrichment pipeline to allow for incremental modification steps without having to rebuild the index every time.")
  cache?: SearchIndexerCache;
}

@doc("Response from a get service statistics request. If successful, it includes service level counters and limits.")
model ServiceStatistics {
  @doc("Service level resource counters.")
  counters?: ServiceCounters;

  @doc("Service level general limits.")
  limits?: ServiceLimits;
}

model ServiceCounters {
  @doc("Total number of documents across all indexes in the service.")
  documentCount?: ResourceCounter;

  @doc("Total number of indexes.")
  indexesCount?: ResourceCounter;

  @doc("Total number of indexers.")
  indexersCount?: ResourceCounter;

  @doc("Total number of data sources.")
  dataSourcesCount?: ResourceCounter;

  @doc("Total size of used storage in bytes.")
  storageSize?: ResourceCounter;

  @doc("Total number of synonym maps.")
  synonymMaps?: ResourceCounter;

  @doc("Total number of skillsets.")
  skillsetCount?: ResourceCounter;
}

model ServiceLimits {
  @doc("The maximum allowed fields per index.")
  maxFieldsPerIndex?: int32;

  @doc("The maximum depth which you can nest sub-fields in an index, including the top-level complex field. For example, a/b/c has a nesting depth of 3.")
  maxFieldNestingDepthPerIndex?: int32;

  @doc("The maximum number of fields of type Collection(Edm.ComplexType) allowed in an index.")
  maxComplexCollectionFieldsPerIndex?: int32;

  @doc("The maximum number of objects in complex collections allowed per document.")
  maxComplexObjectsInCollectionsPerDocument?: int32;
}

model ResourceCounter {
  @doc("The resource usage amount.")
  usage: int64;

  @doc("The resource amount quota.")
  quota?: int64;
}

@doc("Represents a schedule for indexer execution.")
model IndexingSchedule {
  @doc("The interval of time between indexer executions.")
  //@format("duration")
  interval: string;

  @doc("The time when an indexer should start running.")
  startTime?: utcDateTime;
}

@doc("Represents parameters for indexer execution.")
model IndexingParameters {
  @doc("The number of items that are read from the data source and indexed as a single batch in order to improve performance. The default depends on the data source type.")
  batchSize?: int32;

  @doc("The maximum number of items that can fail indexing for indexer execution to still be considered successful. -1 means no limit. Default is 0.")
  maxFailedItems?: int32;

  @doc("The maximum number of items in a single batch that can fail indexing for the batch to still be considered successful. -1 means no limit. Default is 0.")
  maxFailedItemsPerBatch?: int32;

  configuration?: IndexingParametersConfiguration;
}

@doc("A dictionary of indexer-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type.")
model IndexingParametersConfiguration {
  parsingMode?: BlobIndexerParsingMode;

  @doc("Comma-delimited list of filename extensions to ignore when processing from Azure blob storage.  For example, you could exclude '.png, .mp4' to skip over those files during indexing.")
  excludedFileNameExtensions?: string;

  @doc("Comma-delimited list of filename extensions to select when processing from Azure blob storage.  For example, you could focus indexing on specific application files '.docx, .pptx, .msg' to specifically include those file types.")
  indexedFileNameExtensions?: string;

  @doc("For Azure blobs, set to false if you want to continue indexing when an unsupported content type is encountered, and you don't know all the content types (file extensions) in advance.")
  failOnUnsupportedContentType?: boolean = false;

  @doc("For Azure blobs, set to false if you want to continue indexing if a document fails indexing.")
  failOnUnprocessableDocument?: boolean = false;

  @doc("For Azure blobs, set this property to true to still index storage metadata for blob content that is too large to process. Oversized blobs are treated as errors by default. For limits on blob size, see https://docs.microsoft.com/azure/search/search-limits-quotas-capacity.")
  indexStorageMetadataOnlyForOversizedDocuments?: boolean = false;

  @doc("For CSV blobs, specifies a comma-delimited list of column headers, useful for mapping source fields to destination fields in an index.")
  delimitedTextHeaders?: string;

  @doc("For CSV blobs, specifies the end-of-line single-character delimiter for CSV files where each line starts a new document (for example, \" | \").")
  delimitedTextDelimiter?: string;

  @doc("For CSV blobs, indicates that the first (non-blank) line of each blob contains headers.")
  firstLineContainsHeaders?: boolean = true;

  @doc("For JSON arrays, given a structured or semi-structured document, you can specify a path to the array using this property.")
  documentRoot?: string;

  dataToExtract?: BlobIndexerDataToExtract;
  imageAction?: BlobIndexerImageAction;

  @doc("If true, will create a path //document//file_data that is an object representing the original file data downloaded from your blob data source.  This allows you to pass the original file data to a custom skill for processing within the enrichment pipeline, or to the Document Extraction skill.")
  allowSkillsetToReadFileData?: boolean = false;

  pdfTextRotationAlgorithm?: BlobIndexerPDFTextRotationAlgorithm;
  executionEnvironment?: IndexerExecutionEnvironment;

  @doc("Increases the timeout beyond the 5-minute default for Azure SQL database data sources, specified in the format 'hh:mm:ss'.")
  queryTimeout?: string = "00:05:00";
}

@doc("Represents the parsing mode for indexing from an Azure blob data source.")
enum BlobIndexerParsingMode {
  @doc("Set to default for normal file processing.")
  Default: "default",

  @doc("Set to text to improve indexing performance on plain text files in blob storage.")
  Text: "text",

  @doc("Set to delimitedText when blobs are plain CSV files.")
  DelimitedText: "delimitedText",

  @doc("Set to json to extract structured content from JSON files.")
  Json: "json",

  @doc("Set to jsonArray to extract individual elements of a JSON array as separate documents in Azure Cognitive Search.")
  JsonArray: "jsonArray",

  @doc("Set to jsonLines to extract individual JSON entities, separated by a new line, as separate documents in Azure Cognitive Search.")
  JsonLines: "jsonLines",
}

@doc("Specifies the data to extract from Azure blob storage and tells the indexer which data to extract from image content when \"imageAction\" is set to a value other than \"none\".  This applies to embedded image content in a .PDF or other application, or image files such as .jpg and .png, in Azure blobs.")
enum BlobIndexerDataToExtract {
  @doc("Indexes just the standard blob properties and user-specified metadata.")
  StorageMetadata: "storageMetadata",

  @doc("Extracts metadata provided by the Azure blob storage subsystem and the content-type specific metadata (for example, metadata unique to just .png files are indexed).")
  AllMetadata: "allMetadata",

  @doc("Extracts all metadata and textual content from each blob.")
  ContentAndMetadata: "contentAndMetadata",
}

@doc("Determines how to process embedded images and image files in Azure blob storage.  Setting the \"imageAction\" configuration to any value other than \"none\" requires that a skillset also be attached to that indexer.")
enum BlobIndexerImageAction {
  @doc("Ignores embedded images or image files in the data set.  This is the default.")
  None: "none",

  @doc("Extracts text from images (for example, the word \"STOP\" from a traffic stop sign), and embeds it into the content field.  This action requires that \"dataToExtract\" is set to \"contentAndMetadata\".  A normalized image refers to additional processing resulting in uniform image output, sized and rotated to promote consistent rendering when you include images in visual search results. This information is generated for each image when you use this option.")
  GenerateNormalizedImages: "generateNormalizedImages",

  @doc("Extracts text from images (for example, the word \"STOP\" from a traffic stop sign), and embeds it into the content field, but treats PDF files differently in that each page will be rendered as an image and normalized accordingly, instead of extracting embedded images.  Non-PDF file types will be treated the same as if \"generateNormalizedImages\" was set.")
  GenerateNormalizedImagePerPage: "generateNormalizedImagePerPage",
}

@doc("Determines algorithm for text extraction from PDF files in Azure blob storage.")
enum BlobIndexerPDFTextRotationAlgorithm {
  @doc("Leverages normal text extraction.  This is the default.")
  None: "none",

  @doc("May produce better and more readable text extraction from PDF files that have rotated text within them.  Note that there may be a small performance speed impact when this parameter is used.  This parameter only applies to PDF files, and only to PDFs with embedded text.  If the rotated text appears within an embedded image in the PDF, this parameter does not apply.")
  DetectAngles: "detectAngles",
}

@doc("Specifies the environment in which the indexer should execute.")
enum IndexerExecutionEnvironment {
  @doc("Indicates that Azure Cognitive Search can determine where the indexer should execute. This is the default environment when nothing is specified and is the recommended value.")
  standard,

  @doc("Indicates that the indexer should run with the environment provisioned specifically for the search service. This should only be specified as the execution environment if the indexer needs to access resources securely over shared private link resources.")
  private,
}

@doc("Defines a mapping between a field in a data source and a target field in an index.")
model FieldMapping {
  @doc("The name of the field in the data source.")
  sourceFieldName: string;

  @doc("The name of the target field in the index. Same as the source field name by default.")
  targetFieldName?: string;

  @doc("A function to apply to each source field value before indexing.")
  mappingFunction?: FieldMappingFunction;
}

@doc("Represents a function that transforms a value from a data source before indexing.")
model FieldMappingFunction {
  @doc("The name of the field mapping function.")
  name: string;

  @doc("A dictionary of parameter name/value pairs to pass to the function. Each value must be of a primitive type.")
  parameters?: Record<string>;
}

model SearchIndexerCache {
  @doc("The connection string to the storage account where the cache data will be persisted.")
  storageConnectionString?: string;

  @doc("Specifies whether incremental reprocessing is enabled.")
  enableReprocessing?: boolean;
}

@doc("Represents the current status and execution history of an indexer.")
model SearchIndexerStatus {
  @doc("Overall indexer status.")
  status: IndexerStatus;

  @doc("The result of the most recent or an in-progress indexer execution.")
  lastResult?: IndexerExecutionResult;

  @doc("History of the recent indexer executions, sorted in reverse chronological order.")
  executionHistory: IndexerExecutionResult[];

  @doc("The execution limits for the indexer.")
  limits: SearchIndexerLimits;
}

@doc("Represents the overall indexer status.")
enum IndexerStatus {
  @doc("Indicates that the indexer is in an unknown state.")
  Unknown: "unknown",

  @doc("Indicates that the indexer experienced an error that cannot be corrected without human intervention.")
  Error: "error",

  @doc("Indicates that the indexer is running normally.")
  Running: "running",
}

@doc("Represents the result of an individual indexer execution.")
model IndexerExecutionResult {
  @doc("The outcome of this indexer execution.")
  status: IndexerExecutionStatus;

  @doc("The outcome of this indexer execution.")
  statusDetail?: IndexerExecutionStatusDetail;

  @doc("All of the state that defines and dictates the indexer's current execution.")
  currentState?: IndexerCurrentState;

  @doc("The error message indicating the top-level error, if any.")
  errorMessage?: string;

  @doc("The start time of this indexer execution.")
  startTime?: utcDateTime;

  @doc("The end time of this indexer execution, if the execution has already completed.")
  endTime?: utcDateTime;

  @doc("The item-level indexing errors.")
  @visibility("read")
  errors: SearchIndexerError[];

  @doc("The item-level indexing warnings.")
  @visibility("read")
  warnings: SearchIndexerWarning[];

  @doc("The number of items that were processed during this indexer execution. This includes both successfully processed items and items where indexing was attempted but failed.")
  @projectedName("json", "itemsProcessed")
  @visibility("read")
  itemCount: int32;

  @doc("The number of items that failed to be indexed during this indexer execution.")
  @visibility("read")
  @projectedName("json", "itemsFailed")
  failedItemCount: int32;

  @doc("Change tracking state with which an indexer execution started.")
  @visibility("read")
  initialTrackingState?: string;

  @doc("Change tracking state with which an indexer execution finished.")
  @visibility("read")
  finalTrackingState?: string;
}

@doc("Represents the status of an individual indexer execution.")
enum IndexerExecutionStatus {
  @doc("An indexer invocation has failed, but the failure may be transient. Indexer invocations will continue per schedule.")
  TransientFailure: "transientFailure",

  @doc("Indexer execution completed successfully.")
  Success: "success",

  @doc("Indexer execution is in progress.")
  InProgress: "inProgress",

  @doc("Indexer has been reset.")
  Reset: "reset",
}

@doc("Details the status of an individual indexer execution.")
enum IndexerExecutionStatusDetail {
  @doc("Indicates that the reset that occurred was for a call to ResetDocs.")
  ResetDocs: "resetDocs",
}

@doc("Represents all of the state that defines and dictates the indexer's current execution.")
model IndexerCurrentState {
  @doc("The mode the indexer is running in.")
  mode?: IndexingMode;

  @doc("Change tracking state used when indexing starts on all documents in the datasource.")
  allDocsInitialChangeTrackingState?: string;

  @doc("Change tracking state value when indexing finishes on all documents in the datasource.")
  allDocsFinalChangeTrackingState?: string;

  @doc("Change tracking state used when indexing starts on select, reset documents in the datasource.")
  resetDocsInitialChangeTrackingState?: string;

  @doc("Change tracking state value when indexing finishes on select, reset documents in the datasource.")
  resetDocsFinalChangeTrackingState?: string;

  @doc("The list of document keys that have been reset. The document key is the document's unique identifier for the data in the search index. The indexer will prioritize selectively re-ingesting these keys.")
  resetDocumentKeys?: string[];

  @doc("The list of datasource document ids that have been reset. The datasource document id is the unique identifier for the data in the datasource. The indexer will prioritize selectively re-ingesting these ids.")
  resetDatasourceDocumentIds?: string[];
}

@doc("Represents the mode the indexer is executing in.")
enum IndexingMode {
  @doc("The indexer is indexing all documents in the datasource.")
  IndexingAllDocs: "indexingAllDocs",

  @doc("The indexer is indexing selective, reset documents in the datasource. The documents being indexed are defined on indexer status.")
  IndexingResetDocs: "indexingResetDocs",
}

@doc("Represents an item- or document-level indexing error.")
model SearchIndexerError {
  @doc("The key of the item for which indexing failed.")
  key?: string;

  @doc("The message describing the error that occurred while processing the item.")
  errorMessage: string;

  @doc("The status code indicating why the indexing operation failed. Possible values include: 400 for a malformed input document, 404 for document not found, 409 for a version conflict, 422 when the index is temporarily unavailable, or 503 for when the service is too busy.")
  statusCode: int32;

  @doc("The name of the source at which the error originated. For example, this could refer to a particular skill in the attached skillset. This may not be always available.")
  name?: string;

  @doc("Additional, verbose details about the error to assist in debugging the indexer. This may not be always available.")
  details?: string;

  @doc("A link to a troubleshooting guide for these classes of errors. This may not be always available.")
  documentationLink?: string;
}

@doc("Represents an item-level warning.")
model SearchIndexerWarning {
  @doc("The key of the item which generated a warning.")
  key?: string;

  @doc("The message describing the warning that occurred while processing the item.")
  message: string;

  @doc("The name of the source at which the warning originated. For example, this could refer to a particular skill in the attached skillset. This may not be always available.")
  name?: string;

  @doc("Additional, verbose details about the warning to assist in debugging the indexer. This may not be always available.")
  details?: string;

  @doc("A link to a troubleshooting guide for these classes of warnings. This may not be always available.")
  documentationLink?: string;
}

model SearchIndexerLimits {
  @doc("The maximum duration that the indexer is permitted to run for one execution.")
  maxRunTime?: string;

  @doc("The maximum size of a document, in bytes, which will be considered valid for indexing.")
  maxDocumentExtractionSize?: int64;

  @doc("The maximum number of characters that will be extracted from a document picked up for indexing.")
  maxDocumentContentCharactersToExtract?: int64;
}
