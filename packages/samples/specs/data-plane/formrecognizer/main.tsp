import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;

@useAuth(AadOauth2Auth<["https://cognitiveservices.azure.com/.default"]>)
@service({
  title: "Form Recognizer",
})
@useDependency(Azure.Core.Versions.v1_0_Preview_1)
@doc("Extracts content, layout, and structured data from documents.")
namespace Azure.FormRecognizer;

@tag("Management")
interface Management {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service that cannot be changed."
  @doc("Gets information about custom document models.")
  @route("info")
  getInfo is Azure.Core.Foundations.Operation<{}, GetInfoResponse>;
}

alias ApiVersion = "2021-09-30-preview";

alias ServiceTraits = Azure.Core.Traits.NoRepeatableRequests &
  Azure.Core.Traits.NoConditionalRequests &
  Azure.Core.Traits.NoClientRequestId;

alias ResourceOps = Azure.Core.ResourceOperations<ServiceTraits>;

alias AnalyzeContentType =
  | "application/json"
  | "application/octet-stream"
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/tiff"
  | "image/bmp";

@doc("An Accepted response with an Operation-Location header.")
model AcceptedResponse {
  @doc("The status code.")
  @statusCode
  statusCode: 202;

  @doc("Operation result URL.")
  @header("Operation-Location")
  operationLocation: string;
}

@tag("Analysis")
interface Analysis {
  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  #suppress "@azure-tools/typespec-azure-core/byos" "This operation does not follow the standard long-running operation pattern."
  @action("analyze")
  @doc("Runs a custom action on ModelSummary")
  analyzeDocument is ResourceOps.ResourceAction<
    ModelSummary,
    {
      @doc("The content type.")
      @header
      contentType: AnalyzeContentType;

      @doc("List of 1-based page numbers to analyze. Ex. \"1-3,5,7-9\"")
      @query
      pages: string;

      @doc("Locale hint for text recognition and document analysis. Value may contain only the language code (ex. \"en\", \"fr\") or BCP 47 language tag (ex. \"en-US\").")
      @query
      locale: string;

      @doc("The string index type.")
      @query
      stringIndexType: StringIndexType;

      @doc("The request body.")
      @body
      body: bytes;
    },
    AcceptedResponse
  >;

  @doc("Get a AnalyzeResultOperation")
  getAnalyzeResult is ResourceOps.ResourceRead<AnalyzeResultOperation>;
}

@tag("Creation")
interface Creation {
  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Builds a custom document analysis model.")
  // @action("build")
  buildDocumentModel is ResourceOps.ResourceCollectionAction<
    ModelSummary,
    BuildDocumentModelRequest,
    AcceptedResponse
  >;

  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Creates a new model from document types of existing models.")
  // @action("compose")
  composeDocumentModel is ResourceOps.ResourceCollectionAction<
    ModelSummary,
    ComposeDocumentModelRequest,
    AcceptedResponse
  >;

  @doc("Generates authorization to copy a model to this location with specified modelId and optional description.")
  // @action("authorizeCopy")
  authorizeCopyDocumentModel is ResourceOps.ResourceCollectionAction<
    ModelSummary,
    AuthorizeCopyRequest,
    CopyAuthorization
  >;

  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This operation does not follow the standard long-running operation pattern."
  @doc("Copies model to the target resource, region, and modelId.")
  @action("copyTo")
  copyDocumentModelTo is ResourceOps.ResourceAction<
    ModelSummary,
    CopyAuthorization,
    AcceptedResponse
  >;
}

@tag("Operation")
interface Operations {
  @doc("Lists all operations.")
  @get
  listOperations is ResourceOps.ResourceList<OperationInfo>;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is an existing service with a non-standard read operation."
  @doc("Gets operation info.")
  @get
  getOperation is Azure.Core.Foundations.ResourceOperation<OperationInfo, {}, GetOperationResponse>;
}

@tag("Management")
interface DocumentModels {
  @doc("Get a ModelSummary")
  getModel is ResourceOps.ResourceRead<ModelSummary>;

  @doc("List ModelSummary resources")
  listModels is ResourceOps.ResourceList<ModelSummary>;

  @doc("Delete a ModelSummary")
  deleteModel is ResourceOps.ResourceDelete<ModelSummary>;
}

@doc("Method used to compute string offset and length.")
enum StringIndexType {
  @doc("Text elements")
  textElements,

  @doc("Unicode code points")
  unicodeCodePoint,

  @doc("UTF-16 code units")
  utf16CodeUnit,
}

@doc("Unique model name")
@pattern("[a-zA-Z0-9][a-zA-Z0-9._~-]{1,63}")
scalar ModelId extends string;

@doc("Model description.")
@maxLength(4096)
scalar ModelDescription extends string;

@doc("The summary of a model.")
@resource("documentModels")
model ModelSummary {
  @key
  @doc("Unique model name")
  @visibility("read")
  modelId: ModelId;

  @doc("Model description.")
  description: string;

  @doc("Date and time (UTC) when the model was created")
  createdDateTime: utcDateTime;
}

@doc("The details of an error.")
model Error {
  @doc("The error code.")
  code: string;

  @doc("The error message.")
  message: string;

  @doc("The target of the error.")
  target: string;

  @doc("Additional details about the error.")
  details: Error[];

  @doc("The inner error details.")
  innerError: InnerError;
}

@doc("The inner details of an error.")
model InnerError {
  @doc("The error code.")
  code: string;

  @doc("The error message.")
  message: string;

  @doc("The error target.")
  target: string;

  @doc("The inner error details.")
  innerError: InnerError;
}

@doc("Document analysis parameters.")
model AnalyzeDocumentRequest {
  @doc("Content at specified URL.")
  urlSource: string;

  @doc("Content represented via Base64 encoding.")
  base64Source: string;
}

@doc("General information regarding the current resource.")
model GetInfoResponse {
  @doc("Info regarding custom document models.")
  customDocumentModels: CustomDocumentModelsInfo;
}

@doc("Info regarding custom document models.")
model CustomDocumentModelsInfo {
  @doc("Number of custom models in the current resource.")
  count: int32;

  @doc("Maximum number of custom models supported in the current resource.")
  limit: int32;
}

@doc("Operation status.")
enum AnalyzeResultOperationStatus {
  @doc("Operation has not started.")
  notStarted,

  @doc("Operation is running.")
  running,

  @doc("Operation has failed.")
  failed,

  @doc("Operation has succeeded.")
  succeeded,
}

@resource("analyzeResults")
@parentResource(ModelSummary)
@doc("Status and result of the analyze operation.")
model AnalyzeResultOperation {
  @key
  @visibility("none")
  @doc("The result ID.")
  resultId: string;

  @doc("Operation status.")
  status: AnalyzeResultOperationStatus;

  @doc("Date and time (UTC) when the analyze operation was submitted.")
  createdDateTime: utcDateTime;

  @doc("Date and time (UTC) when the status was last updated.")
  lastUpdatedDateTime: utcDateTime;

  @doc("Encountered error during document analysis.")
  error: Error;

  @doc("Document analysis result.")
  analyzeResult: AnalyzeResult;
}

@doc("The result of an analysis job.")
model AnalyzeResult {
  @doc("API version used to produce this result.")
  apiVersion: ApiVersion;

  @doc("Model ID used to produce this result.")
  modelId: ModelId;

  @doc("Method used to compute string offset and length.")
  stringIndexType: StringIndexType;

  @doc("Concatenate string representation of all textual and visual elements in reading order.")
  content: string;

  @doc("Analyzed pages.")
  pages: DocumentPage[];

  @doc("Extracted tables.")
  tables: DocumentTable[];

  @doc("Extracted key-value pairs.")
  keyValuePairs: DocumentKeyValuePair[];

  @doc("Extracted entities.")
  entities: DocumentEntity[];

  @doc("Extracted styles.")
  styles: DocumentStyle[];

  @doc("Extracted documents.")
  documents: Document[];
}

@doc("Content and layout elements extracted from a page from the input.")
model DocumentPage {
  @doc("1-based page number in the input document.")
  @minValue(1)
  pageNumber: int32;

  @doc("The general orientation of the content in clockwise direction, measured in degrees between (-180, 180].")
  @minValue(-180)
  @maxValue(180)
  angle: int32;

  @doc("The width of the image/PDF in pixels/inches, respectively.")
  @minValue(0)
  width: int32;

  @doc("The height of the image/PDF in pixels/inches, respectively.")
  @minValue(0)
  height: int32;

  @doc("The unit used by the width, height, and boundingBox properties.")
  unit: LengthUnit;

  @doc("Location of the page in the reading order concatenated content.")
  spans: DocumentSpan[];

  @doc("Extracted words from the page.")
  words: DocumentWord[];

  @doc("Extracted selection marks from the page.")
  selectionMarks: DocumentSelectionMark[];

  @doc("Extracted lines from the page, potentially containing both textual and visual elements.")
  lines: DocumentLine[];
}

@doc("The unit used by the width, height, and boundingBox properties. For images, the unit is \"pixel\". For PDF, the unit is \"inch\".")
enum LengthUnit {
  @doc("Unit is pixel.")
  pixel,

  @doc("Unit is inch.")
  inch,
}

@doc("Contiguous region of the concatenated content property, specified as an offset and length.")
model DocumentSpan {
  @doc("Zero-based index of the content represented by the span.")
  @minValue(0)
  offset: int32;

  @doc("Number of characters in the content represented by the span.")
  @minValue(0)
  length: int32;
}

@doc("A word object consisting of a contiguous sequence of characters. For non-space delimited languages, such as Chinese, Japanese, and Korean, each character is represented as its own word.")
model DocumentWord {
  @doc("Text content of the word.")
  content: string;

  @doc("Bounding box of the word")
  boundingBox?: BoundingBox;

  @doc("Location of the word in the reading order concatenated content.")
  span: DocumentSpan;

  @doc("Confidence of correctly extracting the word.")
  confidence: Confidence;
}

// @doc(
//   "Quadrangle bounding box, with coordinates specified relative to the top-left of the page. The eight numbers represent the four points, clockwise from the top-left corner relative to the text orientation."
// )
// @maxLength(8)
// @minLength(8)
alias BoundingBox = float64[];

@doc("A selection mark object representing check boxes, radio buttons, and other elements indicating a selection.")
model DocumentSelectionMark {
  @doc("State of the selection mark.")
  state: SelectionMarkState;

  @doc("Bounding box of the selection mark.")
  boundingBox?: BoundingBox;

  @doc("Location of the selection mark in the reading order concatenated content.")
  span: DocumentSpan;

  @doc("Confidence of correctly extracting the selection mark.")
  confidence: Confidence;
}

@doc("Prediction confidence.")
@minValue(0)
@maxValue(1)
scalar Confidence extends float64;

@doc("State of the selection mark.")
enum SelectionMarkState {
  @doc("Selected.")
  selected,

  @doc("Unselected.")
  unselected,
}

@doc("A table object consisting table cells arranged in a rectangular layout.")
model DocumentTable {
  @doc("Number of rows in the table.")
  rowCount: int32;

  @doc("Number of columns in the table.")
  columnCount: int32;

  @doc("Cells contained within the table.")
  cells: DocumentTableCell[];

  @doc("Bounding regions covering the table.")
  boundingRegions?: BoundingRegion[];

  @doc("Location of the table in the reading order concatenated content.")
  spans: DocumentSpan[];
}

@doc("An object representing the location and content of a table cell.")
model DocumentTableCell {
  @doc("The kind of the DocumentTableCell.")
  kind?: DocumentTableCellKind;

  @doc("Row index of the cell.")
  rowIndex: int32;

  @doc("Column  index of the cell.")
  columnIndex: int32;

  @doc("Number of rows spanned by this cell.")
  rowSpan?: int32;

  @doc("Number of columns spanned by this cell.")
  columnSpan?: int32;

  @doc("Concatenated content of the table cell in reading order.")
  content: string;

  @doc("Bounding regions covering the table cell.")
  boundingRegions?: BoundingRegion[];

  @doc("Location of the table cell in the reading order concatenated content.")
  spans: DocumentSpan[];
}

@doc("Table cell kind.")
enum DocumentTableCellKind {
  @doc("Content cell.")
  content,

  @doc("Row header cell.")
  rowHeader,

  @doc("Column header cell.")
  columnHeader,

  @doc("Stub cell.")
  stubHead,

  @doc("Blank cell.")
  description,
}

@doc("Bounding box on a specific page of the input.")
model BoundingRegion {
  @doc("1-based page number of page containing the bounding region.")
  @minValue(1)
  pageNumber: int32;

  @doc("Bounding box on the page, or the entire page if not specified.")
  boundingBox: BoundingBox;
}

@doc("An object representing a form field with distinct field label (key) and field value (may be empty).")
model DocumentKeyValuePair {
  @doc("Field label of the key-value pair.")
  key: DocumentKeyValueElement;

  @doc("Field value of the key-value pair.")
  value?: DocumentKeyValueElement;

  @doc("Confidence of correctly extracting the key-value pair.")
  confidence: Confidence;
}

@doc("An object representing the field key or value in a key-value pair.")
model DocumentKeyValueElement {
  @doc("Concatenated content of the key-value element in reading order.")
  content: string;

  @doc("Location of the key-value element in the reading order concatenated content.")
  spans: DocumentSpan[];

  @doc("Bounding regions covering the key-value element.")
  boundingRegions?: BoundingRegion;
}

@doc("An object representing various categories of entities.")
model DocumentEntity {
  @doc("Entity type.")
  category: string;

  @doc("Entity sub type.")
  subCategory: string;

  @doc("Content content")
  content: string;

  @doc("Bounding regions covering the entity.")
  boundingRegions?: BoundingRegion;

  @doc("Location of the entity in the reading order concatenated content.")
  spans: DocumentSpan[];

  @doc("Confidence of correctly extracting the entity.")
  confidence: Confidence;
}

@doc("An object representing observed text styles.")
model DocumentStyle {
  @doc("Location of the text elements in the concatenated content the style applies to.")
  spans: DocumentSpan[];

  @doc("Confidence of correctly identifying the style.")
  confidence: Confidence;

  @doc("Is content handwritten?")
  isHandwritten?: boolean;
}

@doc("An object describing the location and semantic content of a document.")
model Document {
  @doc("Document type")
  docType: DocType;

  @doc("Location of the document in the reading order concatenated content.")
  spans: DocumentSpan[];

  @doc("Dictionary of named field values.")
  fields: Record<DocumentField>;

  @doc("Confidence of correctly extracting the document.")
  confidence: Confidence;

  @doc("Bounding regions covering the document.")
  boundingRegions?: BoundingRegion;
}

@doc("Document type name.")
@minLength(2)
@maxLength(64)
scalar DocType extends string;

@doc("An object representing the content and location of a field value.")
model DocumentField {
  @doc("Location of the field in the reading order concatenated content.")
  spans: DocumentSpan[];

  @doc("Confidence of correctly extracting the field.")
  confidence: Confidence;

  @doc("Data type of the field value.")
  type: DocumentFieldType;

  @doc("String value.")
  valueString?: string;

  @doc("Date value in YYYY-MM-DD format (ISO 8601).")
  valueDate?: plainDate;

  @doc("Time value in hh:mm:ss format (ISO 8601).")
  valueTime?: plainTime;

  @doc("Phone number value in E.164 format (ex. +19876543210).")
  valuePhoneNumber?: string;

  @doc("Floating point value")
  valueNumber?: float64;

  @doc("Integer value")
  valueInteger?: int64;

  @doc("Selection mark value.")
  valueSelectionMark?: SelectionMarkState;

  @doc("Presence of signature.")
  valueSignature?: DocumentSignatureType;

  @doc("3-letter country code value (ISO 3166-1 alpha-3).")
  valueCountryRegion?: string;

  @doc("Array of field values.")
  valueArray?: DocumentField[];

  @doc("Dictionary of named field values.")
  valueObject?: Record<DocumentField>;

  @doc("Field content.")
  content?: string;

  @doc("Bounding regions covering the field.")
  boundingRegions?: BoundingRegion[];
}

@doc("Semantic data type of the field value.")
enum DocumentFieldType {
  @doc("String value.")
  string,

  @doc("Date value")
  date,

  @doc("Time value")
  time,

  @doc("Phone number value")
  phoneNumber,

  @doc("Floating point value")
  number,

  @doc("Integer value")
  integer,

  @doc("Selection mark value.")
  selectionMark,

  @doc("Country code value.")
  countryRegion,

  @doc("Signature value.")
  signature,

  @doc("Array value.")
  array,

  @doc("Object value.")
  object,
}

@doc("Presence of signature.")
enum DocumentSignatureType {
  @doc("Document is signed.")
  signed,

  @doc("Document is unsigned.")
  unsigned,
}

@doc("A content line object consisting of an adjacent sequence of content elements, such as words and selection marks.")
model DocumentLine {
  @doc("Concatenated content of the contained elements in reading order.")
  content: string;

  @doc("Location of the line in the reading order concatenated content.")
  spans: DocumentSpan;

  @doc("Bounding box of the line.")
  boundingBox?: BoundingBox;
}

@doc("Request body to build a new custom model.")
model BuildDocumentModelRequest {
  @doc("Model Id")
  modelId: ModelId;

  @doc("Model description")
  description?: ModelDescription;

  @doc("Azure Blob Storage location containing the training data.")
  azureBlobSource?: AzureBlobContentSource;
}

@doc("Azure Blob Storage content.")
model AzureBlobContentSource {
  @doc("Azure Blob Storage container URL.")
  containerUrl: string;

  @doc("Blob name prefix.")
  prefix?: string;
}

@doc("Request body to create a composed model from component models.")
model ComposeDocumentModelRequest {
  @doc("Model Id")
  modelId: ModelId;

  @doc("Model description")
  description?: ModelDescription;

  @doc("List of component models to compose.")
  componentModels: ComponentModelInfo[];
}

@doc("A component of a composed model.")
model ComponentModelInfo {
  @doc("Model Id")
  modelId: ModelId;
}

@doc("Request body to authorize model copy.")
model AuthorizeCopyRequest {
  @doc("Model Id")
  modelId: ModelId;

  @doc("Model description")
  description?: ModelDescription;
}

@doc("Authorization to copy a model to the specified target resource and modelId.")
model CopyAuthorization {
  @doc("ID of the target Azure resource where the model should be copied to.")
  targetResourceId: string;

  @doc("Location of the target Azure resource where the model should be copied to.")
  targetResourceRegion: string;

  @doc("Identifier of the target model.")
  targetModelId: ModelId;

  @doc("URL of the copied model in the target account.")
  targetModelLocation: string;

  @doc("Token used to authorize the request.")
  accessToken: string;

  @doc("Date/time when the access token expires.")
  expirationDateTime: utcDateTime;
}

@resource("operations")
@doc("Operation info.")
model OperationInfo {
  @key
  @doc("Operation ID")
  @visibility("read")
  operationId: string;

  @doc("Operation status.")
  status: OperationStatus;

  @doc("Operation progress (0-100).")
  @minValue(0)
  @maxValue(100)
  percentCompleted: int32;

  @doc("Date and time (UTC) when the operation was created.")
  createdDateTime: utcDateTime;

  @doc("Date and time (UTC) when the status was last updated.")
  lastUpdatedDateTime: utcDateTime;

  @doc("Type of operation")
  kind: OperationKind;

  @doc("URL of the resource targeted by this operation.")
  resourceLocation: string;
}

@doc("Operation status.")
enum OperationStatus {
  @doc("Operation has not started yet.")
  notStarted,

  @doc("Operation is running.")
  running,

  @doc("Operation failed.")
  failed,

  @doc("Operation succeeded.")
  succeeded,

  @doc("Operation was canceled.")
  canceled,
}

@doc("Type of operation")
enum OperationKind {
  @doc("Operation to build a new custom model.")
  documentModelBuild,

  @doc("Operation to compose a new custom model.")
  documentModelCompose,

  @doc("Operation to copy a custom model.")
  documentModelCopyTo,
}

@doc("The response for the getOperation operation.")
model GetOperationResponse extends OperationInfo {
  @doc("Encountered error.")
  error?: Error;

  @doc("Operation result upon success.")
  result: {};
}
