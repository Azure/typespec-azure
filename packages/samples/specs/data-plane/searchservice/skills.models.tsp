import "./languages.tsp";
import "./searchservice.models.tsp";

using TypeSpec.OpenAPI;
using TypeSpec.Rest;

namespace Azure.SearchService;

@doc("A list of skills.")
model SearchIndexerSkillset {
  ...ETag;

  @doc("The name of the skillset.")
  name: string;

  @doc("The description of the skillset.")
  description?: string;

  @doc("A list of skills in the skillset.")
  skills: SearchIndexerSkill[];

  @doc("Details about cognitive services to be used when running skills.")
  @encodedName("application/json", "cognitiveServices")
  cognitiveServicesAccount?: CognitiveServicesAccount;

  @doc("Definition of additional projections to azure blob, table, or files, of enriched data.")
  knowledgeStore?: SearchIndexerKnowledgeStore;

  @doc("A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your skillset definition when you want full assurance that no one, not even Microsoft, can decrypt your skillset definition in Azure Cognitive Search. Once you have encrypted your skillset definition, it will always remain encrypted. Azure Cognitive Search will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your skillset definition will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019.")
  encryptionKey?: SearchResourceEncryptionKey | null;
}

@discriminator("@odata.type")
@doc("Base type for skills.")
model SearchIndexerSkill {
  @doc("The name of the skill which uniquely identifies it within the skillset. A skill with no name defined will be given a default name of its 1-based index in the skills array, prefixed with the character '#'.")
  name: string;

  @doc("The description of the skill which describes the inputs, outputs, and usage of the skill.")
  description?: string;

  @doc("Represents the level at which operations take place, such as the document root or document content (for example, /document or /document/content). The default is /document.")
  context?: string;

  @doc("Inputs of the skills could be a column in the source data set, or the output of an upstream skill.")
  inputs: InputFieldMappingEntry[];

  @doc("The output of a skill is either a field in a search index, or a value that can be consumed as an input by another skill.")
  outputs: OutputFieldMappingEntry[];
}

@doc("Input field mapping for a skill.")
model InputFieldMappingEntry {
  @doc("The name of the input.")
  name: string;

  @doc("The source of the input.")
  source?: string;

  @doc("The source context used for selecting recursive inputs.")
  sourceContext?: string;

  @doc("The recursive inputs used when creating a complex type.")
  inputs?: InputFieldMappingEntry[];
}

@doc("Output field mapping for a skill.")
model OutputFieldMappingEntry {
  @doc("The name of the output defined by the skill.")
  name: string;

  @doc("The target name of the output. It is optional and default to name.")
  targetName?: string;
}

@doc("A skill that enables scenarios that require a Boolean operation to determine the data to assign to an output.")
model ConditionalSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Util.ConditionalSkill";
}

@doc("A skill that uses text analytics for key phrase extraction.")
model KeyPhraseExtractionSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.KeyPhraseExtractionSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: KeyPhraseExtractionSkillLanguage;

  @doc("A number indicating how many key phrases to return. If absent, all identified key phrases will be returned.")
  maxKeyPhraseCount?: int32;

  @doc("The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary.")
  modelVersion?: string;
}

@doc("A skill that uses text analytics for key phrase extraction.")
model OcrSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Vision.OcrSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: OcrSkillLanguage;

  @doc("A value indicating to turn orientation detection on or not. Default is false.")
  @encodedName("application/json", "detectOrientation")
  shouldDetectOrientation?: boolean = false;

  @doc("Defines the sequence of characters to use between the lines of text recognized by the OCR skill. The default value is \"space\".")
  lineEnding?: LineEnding; // = LineEnding.Space https://github.com/microsoft/typespec/issues/130
}

enum LineEnding {
  @doc("Lines are separated by a single space character.")
  Space: "space",

  @doc("Lines are separated by a carriage return ('\\r') character.")
  CarriageReturn: "carriageReturn",

  @doc("Lines are separated by a single line feed ('\\n') character.")
  LineFeed: "lineFeed",

  @doc("Lines are separated by a carriage return and a line feed ('\\r\\n') character.")
  CarriageReturnLineFeed: "carriageReturnLineFeed",
}

@doc("A skill that analyzes image files. It extracts a rich set of visual features based on the image content.")
model ImageAnalysisSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Vision.ImageAnalysisSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: ImageAnalysisSkillLanguage;

  @doc("A list of visual features.")
  visualFeatures: VisualFeature[];

  @doc("A string indicating which domain-specific details to return.")
  details: ImageDetail[];
}

@doc("The strings indicating what visual feature types to return.")
enum VisualFeature {
  @doc("Visual features recognized as adult persons.")
  Adult: "adult",

  @doc("Visual features recognized as commercial brands.")
  Brands: "brands",

  @doc("Categories.")
  Categories: "categories",

  @doc("Description.")
  Description: "description",

  @doc("Visual features recognized as people faces.")
  Faces: "faces",

  @doc("Visual features recognized as objects.")
  Objects: "objects",

  @doc("Tags.")
  Tags: "tags",
}

@doc("A string indicating which domain-specific details to return.")
enum ImageDetail {
  @doc("Details recognized as celebrities.")
  Celebrities: "celebrities",

  @doc("Details recognized as landmarks.")
  Landmarks: "landmarks",
}

@doc("A skill that detects the language of input text and reports a single language code for every document submitted on the request. The language code is paired with a score indicating the confidence of the analysis.")
model LanguageDetectionSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.LanguageDetectionSkill";

  @doc("A country code to use as a hint to the language detection model if it cannot disambiguate the language.")
  defaultCountryHint?: string;

  @doc("The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary.")
  modelVersion?: string;
}

@doc("A skill for reshaping the outputs. It creates a complex type to support composite fields (also known as multipart fields).")
model ShaperSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Util.ShaperSkill";
}

@doc("A skill for merging two or more strings into a single unified string, with an optional user-defined delimiter separating each component part.")
model MergeSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.MergeSkill";

  @doc("The tag indicates the start of the merged text. By default, the tag is an empty space.")
  insertPreTag?: string = " ";

  @doc("The tag indicates the end of the merged text. By default, the tag is an empty space.")
  insertPostTag?: string = " ";
}

@doc("Text analytics entity recognition.")
model EntityRecognitionSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.EntityRecognitionSkill";

  @doc("A list of entity categories that should be extracted.")
  categories?: EntityCategory[];

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: EntityRecognitionSkillLanguage;

  @doc("Determines whether or not to include entities which are well known but don't conform to a pre-defined type. If this configuration is not set (default), set to null or set to false, entities which don't conform to one of the pre-defined types will not be surfaced.")
  includeTypelessEntities?: boolean;

  @doc("A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included.")
  minimumPrecision?: float64;
}

@doc("A string indicating what entity categories to return.")
enum EntityCategory {
  @doc("Entities describing a physical location.")
  Location: "location",

  @doc("Entities describing an organization.")
  Organization: "organization",

  @doc("Entities describing a person.")
  Person: "person",

  @doc("Entities describing a quantity.")
  Quantity: "quantity",

  @doc("Entities describing a date and time.")
  Datetime: "datetime",

  @doc("Entities describing a URL.")
  Url: "url",

  @doc("Entities describing an email address.")
  Email: "email",
}

@doc("Text analytics positive-negative sentiment analysis, scored as a floating point value in a range of zero to 1.")
model SentimentSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.SentimentSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: SentimentSkillLanguage;
}

@doc("Using the Text Analytics API, evaluates unstructured text and for each record, provides sentiment labels (such as \"negative\", \"neutral\" and \"positive\") based on the highest confidence score found by the service at a sentence and document-level.")
model SentimentSkillV3 extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.V3.SentimentSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: string;

  @doc("If set to true, the skill output will include information from Text Analytics for opinion mining, namely targets (nouns or verbs) and their associated assessment (adjective) in the text. Default is false.")
  includeOpinionMining?: boolean = false;

  @doc("The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary.")
  modelVersion: string;
}

@doc("Using the Text Analytics API, extracts linked entities from text.")
model EntityLinkingSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.V3.EntityLinkingSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: string;

  @doc("A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included.")
  @minValue(0)
  @maxValue(1)
  minimumPrecision?: float64;

  @doc("The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary.")
  modelVersion?: string;
}

@doc("Using the Text Analytics API, extracts entities of different types from text.")
model EntityRecognitionSkillV3 extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.V3.EntityRecognitionSkill";

  @doc("A list of entity categories that should be extracted.")
  categories?: string[];

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: string;

  @doc("A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included.")
  @minValue(0)
  @maxValue(1)
  minimumPrecision?: float64;

  @doc("The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary.")
  modelVersion?: string;
}

@doc("Using the Text Analytics API, extracts personal information from an input text and gives you the option of masking it.")
model PIIDetectionSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.PIIDetectionSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: string;

  @doc("A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included.")
  @minValue(0)
  @maxValue(1)
  minimumPrecision?: float64;

  @doc("A parameter that provides various ways to mask the personal information detected in the input text. Default is 'none'.")
  maskingMode?: PIIDetectionSkillMaskingMode; //  = PIIDetectionSkillMaskingMode.None

  @doc("The character used to mask the text if the maskingMode parameter is set to replace. Default is '*'.")
  @maxLength(1)
  maskingCharacter?: string;

  @doc("The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary.")
  modelVersion?: string;

  @doc("A list of PII entity categories that should be extracted and masked.")
  piiCategories?: string[];

  @doc("If specified, will set the PII domain to include only a subset of the entity categories. Possible values include: 'phi', 'none'. Default is 'none'.")
  domain?: string;
}

enum PIIDetectionSkillMaskingMode {
  @doc("No masking occurs and the maskedText output will not be returned.")
  None: "none",

  @doc("Replaces the detected entities with the character given in the maskingCharacter parameter. The character will be repeated to the length of the detected entity so that the offsets will correctly correspond to both the input text as well as the output maskedText.")
  Replace: "replace",
}

@doc("A skill to split a string into chunks of text.")
model SplitSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.SplitSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: SplitSkillLanguage;

  @doc("A value indicating which split mode to perform.")
  textSplitMode: TextSplitMode;

  @doc("The desired maximum page length. Default is 10000.")
  maximumPageLength?: int32 = 10000;
}

@doc("A value indicating which split mode to perform.")
model TextSplitMode {
  @doc("Split the text into individual pages.")
  Pages: "pages";

  @doc("Split the text into individual sentences.")
  Sentences: "sentences";
}

@doc("A skill looks for text from a custom, user-defined list of words and phrases.")
model CustomEntityLookupSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.CustomEntityLookupSkill";

  @doc("A value indicating which language code to use. Default is en.")
  defaultLanguageCode?: CustomEntityLookupSkillLanguage;

  @doc("Path to a JSON or CSV file containing all the target text to match against. This entity definition is read at the beginning of an indexer run. Any updates to this file during an indexer run will not take effect until subsequent runs. This config must be accessible over HTTPS.")
  entitiesDefinitionUri?: string;

  @doc("The inline CustomEntity definition.")
  inlineEntitiesDefinition?: CustomEntity[];

  @doc("A global flag for CaseSensitive. If CaseSensitive is not set in CustomEntity, this value will be the default value.")
  globalDefaultCaseSensitive?: boolean;

  @doc("A global flag for AccentSensitive. If AccentSensitive is not set in CustomEntity, this value will be the default value.")
  globalDefaultAccentSensitive?: boolean;

  @doc("A global flag for FuzzyEditDistance. If FuzzyEditDistance is not set in CustomEntity, this value will be the default value.")
  globalDefaultFuzzyEditDistance?: int32;
}

@doc("An object that contains information about the matches that were found, and related metadata.")
model CustomEntity {
  @doc("The top-level entity descriptor. Matches in the skill output will be grouped by this name, and it should represent the \"normalized\" form of the text being found.")
  name: string;

  @doc("This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output.")
  description?: string;

  @doc("This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output.")
  type?: string;

  @doc("This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output.")
  subtype?: string;

  @doc("This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output.")
  id?: string;

  @doc("Defaults to false. Boolean value denoting whether comparisons with the entity name should be sensitive to character casing. Sample case insensitive matches of \"Microsoft\" could be: microsoft, microSoft, MICROSOFT.")
  caseSensitive?: boolean = false;

  @doc("Defaults to false. Boolean value denoting whether comparisons with the entity name should be sensitive to accent.")
  accentSensitive?: boolean = false;

  @doc("Defaults to 0. Maximum value of 5. Denotes the acceptable number of divergent characters that would still constitute a match with the entity name. The smallest possible fuzziness for any given match is returned. For instance, if the edit distance is set to 3, \"Windows10\" would still match \"Windows\", \"Windows10\" and \"Windows 7\". When case sensitivity is set to false, case differences do NOT count towards fuzziness tolerance, but otherwise do.")
  fuzzyEditDistance?: int32 = 0;

  @doc("Changes the default case sensitivity value for this entity. It be used to change the default value of all aliases caseSensitive values.")
  defaultCaseSensitive?: boolean;

  @doc("Changes the default case sensitivity value for this entity. It be used to change the default value of all aliases caseSensitive values.")
  defaultAccentSensitive?: boolean;

  @doc("Changes the default fuzzy edit distance value for this entity. It can be used to change the default value of all aliases fuzzyEditDistance values.")
  defaultFuzzyEditDistance?: int32;

  @doc("An array of complex objects that can be used to specify alternative spellings or synonyms to the root entity name.")
  aliases?: CustomEntityAlias[];
}

@doc("A complex object that can be used to specify alternative spellings or synonyms to the root entity name.")
model CustomEntityAlias {
  @doc("The text of the alias.")
  text: string;

  @doc("Determine if the alias is case sensitive.")
  caseSensitive?: boolean;

  @doc("Determine if the alias is accent sensitive.")
  accentSensitive?: boolean;

  @doc("Determine the fuzzy edit distance of the alias.")
  fuzzyEditDistance?: int32;
}

@doc("A skill to translate text from one language to another.")
model TextTranslationSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Text.TranslationSkill";

  @doc("The language code to translate documents into for documents that don't specify the to language explicitly. ")
  defaultToLanguageCode: TextTranslationSkillLanguage;

  @doc("The language code to translate documents from for documents that don't specify the from language explicitly.")
  defaultFromLanguageCode: TextTranslationSkillLanguage;

  @doc("The language code to translate documents from when neither the fromLanguageCode input nor the defaultFromLanguageCode parameter are provided, and the automatic language detection is unsuccessful. Default is en.")
  suggestedFrom?: TextTranslationSkillLanguage;
}

@doc("A skill that extracts content from a file within the enrichment pipeline.")
model DocumentExtractionSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Util.DocumentExtractionSkill";

  @doc("The parsingMode for the skill. Will be set to 'default' if not defined.")
  parsingMode?: string;

  @doc("The type of data to be extracted for the skill. Will be set to 'contentAndMetadata' if not defined.")
  dataToExtract?: string;

  @doc("A dictionary of configurations for the skill.")
  configuration?: Record<{}>;
}

@doc("A skill that can call a Web API endpoint, allowing you to extend a skillset by having it call your custom code.")
model WebApiSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Custom.WebApiSkill";

  @doc("The url for the Web API.")
  uri: string;

  @doc("The method for the http request.")
  httpMethod: string;

  @doc("The desired timeout for the request. Default is 30 seconds.")
  timeout?: duration;

  @doc("The desired batch size which indicates number of documents.")
  batchSize?: int32;

  @doc("If set, the number of parallel calls that can be made to the Web API.")
  degreeOfParallelism?: int32;
}

@doc("The AML skill allows you to extend AI enrichment with a custom Azure Machine Learning (AML) model. Once an AML model is trained and deployed, an AML skill integrates it into AI enrichment.")
model AmlSkill extends SearchIndexerSkill {
  `@odata.type`: "#Microsoft.Skills.Custom.AmlSkill";

  @doc("(Required for no authentication or key authentication) The scoring URI of the AML service to which the JSON payload will be sent. Only the https URI scheme is allowed.")
  uri?: string;

  @doc("(Required for key authentication) The key for the AML service.")
  key?: string;

  @doc("(Required for token authentication). The Azure Resource Manager resource ID of the AML service. It should be in the format subscriptions/{guid}/resourceGroups/{resource-group-name}/Microsoft.MachineLearningServices/workspaces/{workspace-name}/services/{service_name}.")
  resourceId?: string;

  @doc("(Optional) When specified, indicates the timeout for the http client making the API call.")
  timeout?: duration;

  @doc("(Optional for token authentication). The region the AML service is deployed in.")
  region?: string;

  @doc("(Optional) When specified, indicates the number of calls the indexer will make in parallel to the endpoint you have provided. You can decrease this value if your endpoint is failing under too high of a request load, or raise it if your endpoint is able to accept more requests and you would like an increase in the performance of the indexer. If not set, a default value of 5 is used. The degreeOfParallelism can be set to a maximum of 10 and a minimum of 1.")
  degreeOfParallelism?: int32;
}

@doc("Base type for describing any cognitive service resource attached to a skillset.")
model CognitiveServicesAccount {
  @doc("Description of the cognitive service resource attached to a skillset.")
  description: string;
}

@doc("An empty object that represents the default cognitive service resource for a skillset.")
model DefaultCognitiveServicesAccount extends CognitiveServicesAccount {
  `@odata.type`: "#Microsoft.Azure.Search.DefaultCognitiveServices";
}

@doc("A cognitive service resource provisioned with a key that is attached to a skillset.")
model CognitiveServicesAccountKey extends CognitiveServicesAccount {
  `@odata.type`: "#Microsoft.Azure.Search.CognitiveServicesByKey";

  @doc("The key used to provision the cognitive service resource attached to a skillset.")
  key: string;
}

@doc("Definition of additional projections to azure blob, table, or files, of enriched data.")
model SearchIndexerKnowledgeStore {
  @doc("The connection string to the storage account projections will be stored in.")
  storageConnectionString: string;

  @doc("A list of additional projections to perform during indexing.")
  projections: SearchIndexerKnowledgeStoreProjection[];
}

@doc("Container object for various projection selectors.")
model SearchIndexerKnowledgeStoreProjection {
  @doc("Projections to Azure Table storage.")
  tables?: SearchIndexerKnowledgeStoreTableProjectionSelector;

  @doc("Projections to Azure Blob storage.")
  objects?: SearchIndexerKnowledgeStoreObjectProjectionSelector;

  @doc("Projections to Azure File storage.")
  files?: SearchIndexerKnowledgeStoreFileProjectionSelector;
}

@doc("Abstract class to share properties between concrete selectors.")
model SearchIndexerKnowledgeStoreProjectionSelector {
  @doc("Name of reference key to different projection.")
  referenceKeyName?: string;

  @doc("Name of generated  key to  store projection under.")
  generatedKeyName?: string;

  @doc("Source data to project.")
  source?: string;

  @doc("Source context for complex projections.")
  sourceContext?: string;

  @doc("Nested inputs for complex projections.")
  inputs?: InputFieldMappingEntry[];
}

@doc("Description for what data to store in Azure Tables.")
model SearchIndexerKnowledgeStoreTableProjectionSelector
  extends SearchIndexerKnowledgeStoreProjectionSelector {
  @doc("Name of the Azure table to store projected data in.")
  tableName: string;
}

@doc("Abstract class to share properties between concrete selectors.")
model SearchIndexerKnowledgeStoreBlobProjectionSelector
  extends SearchIndexerKnowledgeStoreProjectionSelector {
  @doc("Blob container to store projections in.")
  storageContainer: string;
}

@doc("Projection definition for what data to store in Azure Blob.")
model SearchIndexerKnowledgeStoreObjectProjectionSelector
  extends SearchIndexerKnowledgeStoreBlobProjectionSelector {}

@doc("Projection definition for what data to store in Azure Files.")
model SearchIndexerKnowledgeStoreFileProjectionSelector
  extends SearchIndexerKnowledgeStoreBlobProjectionSelector {}

@doc("The names of skills to reset.")
model SkillNames {
  @doc("the names of skills to be reset.")
  skillNames: string[];
}
