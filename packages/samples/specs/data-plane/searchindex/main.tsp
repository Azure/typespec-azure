// Based on https://github.com/Azure/azure-rest-api-specs/blob/main/specification/search/data-plane/Azure.Search/preview/2021-04-30-Preview/searchindex.json

// (PR TODO: I think we have issue for arbitrary JSON extension/object literals, but can't find it)
// ISSUE: Can't set x-ms-code-generation-settings: https://github.com/Azure/typespec-azure/issues/1132
// ISSUE: Can't set x-ms-parameter-grouping: https://github.com/Azure/typespec-azure/issues/1000
// ISSUE: Can't set service description: https://github.com/Azure/typespec-azure/issues/1032
// ISSUE: @extension on parameter doesn't work: https://github.com/Azure/typespec-azure/issues/1121

// cspell:ignore Viet

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@azure-tools/typespec-azure-core";

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
  title: "SearchIndexClient",
})
namespace Azure.SearchIndex;

using Azure.Core;
using TypeSpec.Http;
using TypeSpec.OpenAPI;

#suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "Existing service."
@fixed
@doc("Specifies the mode for Autocomplete. The default is 'oneTerm'. Use 'twoTerms' to get shingles and 'oneTermWithContext' to use the current context in producing autocomplete terms.")
enum AutocompleteMode {
  @doc("Only one term is suggested. If the query has two terms, only the last term is completed. For example, if the input is 'washington medic', the suggested terms could include 'medicaid', 'medicare', and 'medicine'.")
  OneTerm: "oneTerm",

  @doc("Matching two-term phrases in the index will be suggested. For example, if the input is 'medic', the suggested terms could include 'medicare coverage' and 'medical assistant'.")
  TwoTerms: "twoTerms",

  @doc("Completes the last term in a query with two or more terms, where the last two terms are a phrase that exists in the index. For example, if the input is 'washington medic', the suggested terms could include 'washington medicaid' and 'washington medical'.")
  OneTermWithContext: "oneTermWithContext",
}

@doc("This parameter is only valid if the query type is 'semantic'. If set, the query returns answers extracted from key passages in the highest ranked documents. The number of answers returned can be configured by appending the pipe character '|' followed by the 'count-<number of answers>' option after the answers parameter value, such as 'extractive|count-3'. Default count is 1.")
enum QueryAnswerType {
  @doc("Do not return answers for the query.")
  None: "none",

  @doc("Extracts answer candidates from the contents of the documents returned in response to a query expressed as a question in natural language.")
  Extractive: "extractive",
}

@doc("This parameter is only valid if the query type is 'semantic'. If set, the query returns captions extracted from key passages in the highest ranked documents. When s is set to 'extractive', highlighting is enabled by default, and can be configured by appending the pipe character '|' followed by the 'highlight-<true/false>' option, such as 'extractive|highlight-true'. Defaults to 'None'.")
enum QueryCaptionType {
  @doc("Do not return captions for the query.")
  None: "none",

  @doc("Extracts captions from the matching documents that contain passages relevant to the search query.")
  Extractive: "extractive",
}

@doc("The language of the query.")
enum QueryLanguage {
  @doc("Query language not specified.")
  None: "none",

  @doc("Query language value for English (United States).")
  EnUs: "en-us",

  @doc("Query language value for English (Great Britain).")
  EnGb: "en-gb",

  @doc("Query language value for English (India).")
  EnIn: "en-in",

  @doc("Query language value for English (Canada).")
  EnCa: "en-ca",

  @doc("Query language value for English (Australia).")
  EnAu: "en-au",

  @doc("Query language value for French (France).")
  FrFr: "fr-fr",

  @doc("Query language value for French (Canada).")
  FrCa: "fr-ca",

  @doc("Query language value for German (Germany).")
  DeDe: "de-de",

  @doc("Query language value for Spanish (Spain).")
  EsEs: "es-es",

  @doc("Query language value for Spanish (Mexico).")
  EsMx: "es-mx",

  @doc("Query language value for Chinese (China).")
  ZhCn: "zh-cn",

  @doc("Query language value for Chinese (Taiwan).")
  ZhTw: "zh-tw",

  @doc("Query language value for Portuguese (Brazil).")
  PtBr: "pt-br",

  @doc("Query language value for Portuguese (Portugal).")
  PtPt: "pt-pt",

  @doc("Query language value for Italian (Italy).")
  ItIt: "it-it",

  @doc("Query language value for Japanese (Japan).")
  JaJp: "ja-jp",

  @doc("Query language value for Korean (Korea).")
  KoKr: "ko-kr",

  @doc("Query language value for Russian (Russia).")
  RuRu: "ru-ru",

  @doc("Query language value for Czech (Czech Republic).")
  CsCz: "cs-cz",

  @doc("Query language value for Dutch (Belgium).")
  NlBe: "nl-be",

  @doc("Query language value for Dutch (Netherlands).")
  NlNl: "nl-nl",

  @doc("Query language value for Hungarian (Hungary).")
  HuHu: "hu-hu",

  @doc("Query language value for Polish (Poland).")
  PlPl: "pl-pl",

  @doc("Query language value for Swedish (Sweden).")
  SvSe: "sv-se",

  @doc("Query language value for Turkish (Turkey).")
  TrTr: "tr-tr",

  @doc("Query language value for Hindi (India).")
  HiIn: "hi-in",

  @doc("Query language value for Arabic (Saudi Arabia).")
  ArSa: "ar-sa",

  @doc("Query language value for Arabic (Egypt).")
  ArEg: "ar-eg",

  @doc("Query language value for Arabic (Morocco).")
  ArMa: "ar-ma",

  @doc("Query language value for Arabic (Kuwait).")
  ArKw: "ar-kw",

  @doc("Query language value for Arabic (Jordan).")
  ArJo: "ar-jo",

  @doc("Query language value for Danish (Denmark).")
  DaDk: "da-dk",

  @doc("Query language value for Norwegian (Norway).")
  NoNo: "no-no",

  @doc("Query language value for Bulgarian (Bulgaria).")
  BgBg: "bg-bg",

  @doc("Query language value for Croatian (Croatia).")
  HrHr: "hr-hr",

  @doc("Query language value for Croatian (Bosnia and Herzegovina).")
  HrBa: "hr-ba",

  @doc("Query language value for Malay (Malaysia).")
  MsMy: "ms-my",

  @doc("Query language value for Malay (Brunei Darussalam).")
  MsBn: "ms-bn",

  @doc("Query language value for Slovenian (Slovenia).")
  SlSl: "sl-sl",

  @doc("Query language value for Tamil (India).")
  TaIn: "ta-in",

  @doc("Query language value for Vietnamese (Viet Nam).")
  ViVn: "vi-vn",

  @doc("Query language value for Greek (Greece).")
  ElGr: "el-gr",

  @doc("Query language value for Romanian (Romania).")
  RoRo: "ro-ro",

  @doc("Query language value for Icelandic (Iceland).")
  IsIs: "is-is",

  @doc("Query language value for Indonesian (Indonesia).")
  IdId: "id-id",

  @doc("Query language value for Thai (Thailand).")
  ThTh: "th-th",

  @doc("Query language value for Lithuanian (Lithuania).")
  LtLt: "lt-lt",

  @doc("Query language value for Ukrainian (Ukraine).")
  UkUa: "uk-ua",

  @doc("Query language value for Latvian (Latvia).")
  LvLv: "lv-lv",

  @doc("Query language value for Estonian (Estonia).")
  EtEe: "et-ee",

  @doc("Query language value for Catalan (Spain).")
  CaEs: "ca-es",

  @doc("Query language value for Finnish (Finland).")
  FiFi: "fi-fi",

  @doc("Query language value for Serbian (Bosnia and Herzegovina).")
  SrBa: "sr-ba",

  @doc("Query language value for Serbian (Montenegro).")
  SrMe: "sr-me",

  @doc("Query language value for Serbian (Serbia).")
  SrRs: "sr-rs",

  @doc("Query language value for Slovak (Slovakia).")
  SkSk: "sk-sk",

  @doc("Query language value for Norwegian (Norway).")
  NbNo: "nb-no",

  @doc("Query language value for Armenian (Armenia).")
  HyAm: "hy-am",

  @doc("Query language value for Bengali (India).")
  BnIn: "bn-in",

  @doc("Query language value for Basque (Spain).")
  EuEs: "eu-es",

  @doc("Query language value for Galician (Spain).")
  GlEs: "gl-es",

  @doc("Query language value for Gujarati (India).")
  GuIn: "gu-in",

  @doc("Query language value for Hebrew (Israel).")
  HeIl: "he-il",

  @doc("Query language value for Irish (Ireland).")
  GaIe: "ga-ie",

  @doc("Query language value for Kannada (India).")
  KnIn: "kn-in",

  @doc("Query language value for Malayalam (India).")
  MlIn: "ml-in",

  @doc("Query language value for Marathi (India).")
  MrIn: "mr-in",

  @doc("Query language value for Persian (U.A.E.).")
  FaAe: "fa-ae",

  @doc("Query language value for Punjabi (India).")
  PaIn: "pa-in",

  @doc("Query language value for Telugu (India).")
  TeIn: "te-in",

  @doc("Query language value for Urdu (Pakistan).")
  UrPk: "ur-pk",
}

@doc("Improve search recall by spell-correcting individual search query terms.")
enum QuerySpellerType {
  @doc("Speller not enabled.")
  None: "none",

  @doc("Speller corrects individual query terms using a static lexicon for the language specified by the queryLanguage parameter.")
  Lexicon: "lexicon",
}

#suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "Existing service."
@fixed
@doc("Specifies the syntax of the search query. The default is 'simple'. Use 'full' if your query uses the Lucene query syntax and 'semantic' if query syntax is not needed.")
enum QueryType {
  @doc("Uses the simple query syntax for searches. Search text is interpreted using a simple query language that allows for symbols such as +, * and \"\". Queries are evaluated across all searchable fields by default, unless the searchFields parameter is specified.")
  Simple: "simple",

  @doc("Uses the full Lucene query syntax for searches. Search text is interpreted using the Lucene query language which allows field-specific and weighted searches, as well as other advanced features.")
  Full: "full",

  @doc("Best suited for queries expressed in natural language as opposed to keywords. Improves precision of search results by re-ranking the top search results using a ranking model trained on the Web corpus.")
  Semantic: "semantic",
}

#suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "Existing service."
@fixed
@doc("Index action type")
enum IndexActionType {
  @doc("Inserts the document into the index if it is new and updates it if it exists. All fields are replaced in the update case.")
  Upload: "upload",

  @doc("Merges the specified field values with an existing document. If the document does not exist, the merge will fail. Any field you specify in a merge will replace the existing field in the document. This also applies to collections of primitive and complex types.")
  Merge: "merge",

  @doc("Behaves like merge if a document with the given key already exists in the index. If the document does not exist, it behaves like upload with a new document.")
  MergeOrUpload: "mergeOrUpload",

  @doc("Removes the specified document from the index. Any field you specify in a delete operation other than the key field will be ignored. If you want to remove an individual field from a document, use merge instead and set the field explicitly to null.")
  Delete: "delete",
}

#suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "Existing service."
@fixed
@doc("Specifies whether any or all of the search terms must be matched in order to count the document as a match.")
enum SearchMode {
  @doc("Any of the search terms must be matched in order to count the document as a match.")
  Any: "any",

  @doc("All of the search terms must be matched in order to count the document as a match.")
  All: "all",
}

#suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "Existing service."
@fixed
@doc("A value that specifies whether we want to calculate scoring statistics (such as document frequency) globally for more consistent scoring, or locally, for lower latency. The default is 'local'. Use 'global' to aggregate scoring statistics globally before scoring. Using global scoring statistics can increase latency of search queries.")
enum ScoringStatistics {
  @doc("The scoring statistics will be calculated locally for lower latency.")
  Local: "local",

  @doc("The scoring statistics will be calculated globally for more consistent scoring.")
  Global: "global",
}

@doc("Api Version Parameter")
model ApiVersionParameter {
  #suppress "@azure-tools/typespec-azure-core/casing-style" "This is the name of a query parameter."
  @doc("Client Api Version.")
  @query
  `api-version`: string;
}

@doc("Client Request Id Parameter")
model ClientRequestIdParameter {
  #suppress "@azure-tools/typespec-azure-core/casing-style" "This is the name of a header."
  @doc("The tracking ID sent with the request to help with debugging.")
  @extension("x-ms-client-id", true)
  @header
  `x-ms-client-request-id`?: string; // ISSUE: Can't set format=uuid: https://github.com/microsoft/typespec/issues/153
}

// ISSUE: Can't allow additionalProperties: https://github.com/Azure/typespec-azure/issues/997
@doc("An answer is a text passage extracted from the contents of the most relevant documents that matched the query. Answers are extracted from the top search results. Answer candidates are scored and the top answers are selected.")
model AnswerResult {
  @doc("The score value represents how relevant the answer is to the the query relative to other answers returned for the query.")
  @visibility("read")
  score?: float64;

  @doc("The key of the document the answer was extracted from.")
  @visibility("read")
  key?: string;

  @doc("The text passage extracted from the document contents as the answer.")
  @visibility("read")
  text?: string;

  #suppress "@azure-tools/typespec-azure-core/no-nullable" "Existing service"
  @doc("Same text passage as in the Text property with highlighted text phrases most relevant to the query.")
  @visibility("read")
  highlights?: string | null;
}

@doc("The result of Autocomplete requests.")
model AutocompleteItem {
  @doc("The completed term.")
  @visibility("read")
  text: string;

  @doc("The query along with the completed term.")
  @visibility("read")
  queryPlusText: string;
}

@doc("The result of Autocomplete query.")
model AutocompleteResult {
  @doc("A value indicating the percentage of the index that was considered by the autocomplete request, or null if minimumCoverage was not specified in the request.")
  @encodedName("application/json", "@search.coverage")
  @visibility("read")
  coverage?: float64;

  @doc("The list of returned Autocompleted items.")
  @encodedName("application/json", "value")
  @visibility("read")
  results: AutocompleteItem[];
}

@doc("Parameters for fuzzy matching, and other autocomplete query behaviors.")
model AutocompleteRequest {
  @doc("The search text on which to base autocomplete results.")
  @encodedName("application/json", "search")
  searchText: string;

  @doc("Specifies the mode for Autocomplete. The default is 'oneTerm'. Use 'twoTerms' to get shingles and 'oneTermWithContext' to use the current context while producing auto-completed terms.")
  autocompleteMode?: AutocompleteMode;

  @doc("An OData expression that filters the documents used to produce completed terms for the Autocomplete result.")
  filter?: string;

  @doc("A value indicating whether to use fuzzy matching for the autocomplete query. Default is false. When set to true, the query will autocomplete terms even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy autocomplete queries are slower and consume more resources.")
  @encodedName("application/json", "fuzzy")
  useFuzzyMatching?: boolean;

  @doc("A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting is disabled.")
  highlightPostTag?: string;

  @doc("A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting is disabled.")
  highlightPreTag?: string;

  @doc("A number between 0 and 100 indicating the percentage of the index that must be covered by an autocomplete query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80.")
  minimumCoverage?: float64;

  @doc("The comma-separated list of field names to consider when querying for auto-completed terms. Target fields must be included in the specified suggester.")
  searchFields?: string;

  @doc("The name of the suggester as specified in the suggesters collection that's part of the index definition.")
  suggesterName: string;

  @doc("The number of auto-completed terms to retrieve. This must be a value between 1 and 100. The default is 5.")
  top?: int32;
}

// ISSUE: Can't allow additionalProperties: https://github.com/Azure/typespec-azure/issues/997
@doc("Captions are the most representative passages from the document relatively to the search query. They are often used as document summary. Captions are only returned for queries of type 'semantic'..")
model CaptionResult {
  #suppress "@azure-tools/typespec-azure-core/no-nullable" "Existing service"
  @doc("Same text passage as in the Text property with highlighted phrases most relevant to the query.")
  @visibility("read")
  highlights?: string | null;

  @doc("A representative text passage extracted from the document most relevant to the search query.")
  @visibility("read")
  text?: string;
}

// ISSUE: Can't allow additionalProperties: https://github.com/Azure/typespec-azure/issues/997
@doc("A single bucket of a facet query result. Reports the number of documents with a field value falling within a particular range or having a particular value or interval.")
model FacetResult {
  @doc("The approximate count of documents falling within the bucket described by this facet.")
  @visibility("read")
  count?: int64;
}

@doc("Response containing search results from an index.")
model SearchDocumentsResult {
  @doc("The total count of results found by the search operation, or null if the count was not requested. If present, the count may be greater than the number of results in this response. This can happen if you use the $top or $skip parameters, or if Azure Cognitive Search can't return all the requested documents in a single Search response.")
  @encodedName("application/json", "@odata.count")
  @visibility("read")
  count?: int64;

  @doc("Continuation URL returned when Azure Cognitive Search can't return all the requested results in a single Search response. You can use this URL to formulate another GET or POST Search request to get the next part of the search response. Make sure to use the same verb (GET or POST) as the request that produced this response.")
  @encodedName("application/json", "@odata.nextLink")
  @visibility("read")
  nextLink?: string;

  #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing service."
  @doc("A value indicating the percentage of the index that was included in the query, or null if minimumCoverage was not specified in the request.")
  @visibility("read")
  `@search.coverage`?: float64;

  @doc("The facet query results for the search operation, organized as a collection of buckets for each faceted field; null if the query did not include any facet expressions.")
  @encodedName("application/json", "@search.facets")
  @visibility("read")
  facets?: Record<FacetResult[]>;

  @doc("The answers query results for the search operation; null if the answers query parameter was not specified or set to 'none'.")
  @encodedName("application/json", "@search.answers")
  @visibility("read")
  answers?: AnswerResult[];

  @doc("Continuation JSON payload returned when Azure Cognitive Search can't return all the requested results in a single Search response. You can use this JSON along with @odata.nextLink to formulate another POST Search request to get the next part of the search response.")
  @encodedName("application/json", "@search.nextPageParameters")
  @visibility("read")
  nextPageParameters?: SearchRequest;

  @doc("The sequence of results returned by the query.")
  @encodedName("application/json", "value")
  @visibility("read")
  results: SearchResult[];
}

@doc("Describes an error condition for the Azure Cognitive Search API.")
@error
model SearchError {
  @doc("One of a server-defined set of error codes.")
  @visibility("read")
  code?: string;

  @doc("A human-readable representation of the error.")
  @visibility("read")
  message: string;

  @doc("An array of details about specific errors that led to this reported error.")
  @visibility("read")
  details?: SearchError[];
}

// ISSUE: Can't allow additionalProperties: https://github.com/Azure/typespec-azure/issues/997
@doc("Contains a document found by a search query, plus associated metadata.")
model SearchResult {
  #suppress "@azure-tools/typespec-azure-core/no-nullable" "Existing service"
  @doc("Captions are the most representative passages from the document relatively to the search query. They are often used as document summary. Captions are only returned for queries of type 'semantic'.")
  @encodedName("application/json", "@search.captions")
  @visibility("read")
  captions?: CaptionResult[] | null;

  @doc("Text fragments from the document that indicate the matching search terms, organized by each applicable field; null if hit highlighting was not enabled for the query.")
  @encodedName("application/json", "@search.highlights")
  @visibility("read")
  highlights?: Record<string[]>;

  #suppress "@azure-tools/typespec-azure-core/no-nullable" "Existing service"
  @doc("The relevance score computed by the semantic ranker for the top search results. Search results are sorted by the RerankerScore first and then by the Score. RerankerScore is only returned for queries of type 'semantic'.")
  @encodedName("application/json", "@search.rerankerScore")
  @visibility("read")
  rerankerScore?: float64 | null;

  @doc("The relevance score of the document compared to other documents returned by the query.")
  @encodedName("application/json", "@search.score")
  @visibility("read")
  score: float64;
}

@doc("Parameters for filtering, sorting, faceting, paging, and other search query behaviors.")
model SearchRequest {
  @doc("A value that specifies whether to fetch the total count of results. Default is false. Setting this value to true may have a performance impact. Note that the count returned is an approximation.")
  @encodedName("application/json", "count")
  includeTotalResultCount?: boolean;

  @doc("The list of facet expressions to apply to the search query. Each facet expression contains a field name, optionally followed by a comma-separated list of name:value pairs.")
  facets?: string[]; // ISSUE: Can't set externalDocs: https://github.com/Azure/typespec-azure/issues/1035

  @doc("The OData $filter expression to apply to the search query.")
  filter?: string; // ISSUE: Can't set externalDocs: https://github.com/Azure/typespec-azure/issues/1035

  @doc("The comma-separated list of field names to use for hit highlights. Only searchable fields can be used for hit highlighting.")
  @encodedName("application/json", "highlight")
  highlightFields?: string;

  @doc("A string tag that is appended to hit highlights. Must be set with highlightPreTag. Default is &lt;/em&gt;.")
  highlightPostTag?: string;

  @doc("A string tag that is prepended to hit highlights. Must be set with highlightPostTag. Default is &lt;em&gt;.")
  highlightPreTag?: string;

  @doc("A number between 0 and 100 indicating the percentage of the index that must be covered by a search query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 100.")
  minimumCoverage?: float64;

  @doc("The comma-separated list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, or desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no $orderby is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses.")
  @encodedName("application/json", "orderby")
  orderBy?: string;

  @doc("A value that specifies the syntax of the search query. The default is 'simple'. Use 'full' if your query uses the Lucene query syntax.")
  queryType?: QueryType;

  @doc("A value that specifies whether we want to calculate scoring statistics (such as document frequency) globally for more consistent scoring, or locally, for lower latency. The default is 'local'. Use 'global' to aggregate scoring statistics globally before scoring. Using global scoring statistics can increase latency of search queries.")
  scoringStatistics?: ScoringStatistics;

  @doc("A value to be used to create a sticky session, which can help getting more consistent results. As long as the same sessionId is used, a best-effort attempt will be made to target the same replica set. Be wary that reusing the same sessionID values repeatedly can interfere with the load balancing of the requests across replicas and adversely affect the performance of the search service. The value used as sessionId cannot start with a '_' character.")
  sessionId?: string;

  @doc("The list of parameter values to be used in scoring functions (for example, referencePointParameter) using the format name-values. For example, if the scoring profile defines a function with a parameter called 'mylocation' the parameter string would be \"mylocation--122.2,44.8\" (without the quotes).")
  scoringParameters?: string[]; // ISSUE: Can't set collectionFormat: https://github.com/Azure/typespec-azure/issues/1031

  @doc("The name of a scoring profile to evaluate match scores for matching documents in order to sort the results.")
  scoringProfile?: string;

  @doc("The name of a semantic configuration that will be used when processing documents for queries of type semantic.")
  semanticConfiguration?: string;

  @doc("A full-text search query expression; Use \"*\" or omit this parameter to match all documents.")
  @encodedName("application/json", "search")
  searchText?: string;

  @doc("The comma-separated list of field names to which to scope the full-text search. When using fielded search (fieldName:searchExpression) in a full Lucene query, the field names of each fielded search expression take precedence over any field names listed in this parameter.")
  searchFields?: string;

  @doc("A value that specifies whether any or all of the search terms must be matched in order to count the document as a match.")
  searchMode?: SearchMode;

  @doc("A value that specifies the language of the search query.")
  queryLanguage?: QueryLanguage;

  @doc("A value that specified the type of the speller to use to spell-correct individual search query terms.")
  speller?: QuerySpellerType;

  @doc("A value that specifies whether answers should be returned as part of the search response.")
  answers?: QueryAnswerType;

  @doc("The comma-separated list of fields to retrieve. If unspecified, all fields marked as retrievable in the schema are included.")
  select?: string;

  @doc("The number of search results to skip. This value cannot be greater than 100,000. If you need to scan documents in sequence, but cannot use skip due to this limitation, consider using orderby on a totally-ordered key and filter with a range query instead.")
  skip?: int32;

  @doc("The number of search results to retrieve. This can be used in conjunction with $skip to implement client-side paging of search results. If results are truncated due to server-side paging, the response will include a continuation token that can be used to issue another Search request for the next page of results.")
  top?: int32;

  @doc("A value that specifies whether captions should be returned as part of the search response.")
  captions?: QueryCaptionType;

  @doc("The comma-separated list of field names used for semantic search.")
  semanticFields?: string;
}

// ISSUE: Can't allow additionalProperties: https://github.com/Azure/typespec-azure/issues/997
@doc("Represents an index action that operates on a document.")
model IndexAction {
  @doc("The operation to perform on a document in an indexing batch.")
  @encodedName("application/json", "@search.action")
  actiontype?: IndexActionType;
}

@doc("Contains a batch of document write actions to send to the index.")
model IndexBatch {
  @doc("The actions in the batch.")
  @encodedName("application/json", "value")
  actions: IndexAction[];
}

@doc("Response containing the status of operations for all documents in the indexing request.")
model IndexDocumentsResult {
  @doc("The list of status information for each document in the indexing request.")
  @encodedName("application/json", "value")
  @visibility("read")
  results: IndexingResult[];
}

@doc("Status of an indexing operation for a single document.")
model IndexingResult {
  @doc("The key of a document that was in the indexing request.")
  @visibility("read")
  key: string;

  @doc("The error message explaining why the indexing operation failed for the document identified by the key; null if indexing succeeded.")
  @visibility("read")
  errorMessage?: string;

  @doc("A value indicating whether the indexing operation succeeded for the document identified by the key.")
  @encodedName("application/json", "status")
  @visibility("read")
  succeeded: boolean;

  @doc("The status code of the indexing operation. Possible values include: 200 for a successful update or delete, 201 for successful document creation, 400 for a malformed input document, 404 for document not found, 409 for a version conflict, 422 when the index is temporarily unavailable, or 503 for when the service is too busy.")
  @visibility("read")
  statusCode: int32;
}

@doc("Response containing suggestion query results from an index.")
model SuggestDocumentsResult {
  @doc("The sequence of results returned by the query.")
  @encodedName("application/json", "value")
  @visibility("read")
  results: SuggestResult[];

  @doc("A value indicating the percentage of the index that was included in the query, or null if minimumCoverage was not set in the request.")
  @encodedName("application/json", "@search.coverage")
  @visibility("read")
  coverage?: float64;
}

// ISSUE: Can't allow additionalProperties: https://github.com/Azure/typespec-azure/issues/997
@doc("A result containing a document found by a suggestion query, plus associated metadata.")
model SuggestResult {
  @doc("The text of the suggestion result.")
  @encodedName("application/json", "@search.text")
  @visibility("read")
  text: string;
}

@doc("Parameters for filtering, sorting, fuzzy matching, and other suggestions query behaviors.")
model SuggestRequest {
  // ISSUE: Can't set externalDocs: https://github.com/Azure/typespec-azure/issues/1035
  @doc("An OData expression that filters the documents considered for suggestions.")
  filter?: string;

  @doc("A value indicating whether to use fuzzy matching for the suggestion query. Default is false. When set to true, the query will find suggestions even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy suggestion searches are slower and consume more resources.")
  @encodedName("application/json", "fuzzy")
  useFuzzyMatching?: boolean;

  @doc("A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting of suggestions is disabled.")
  highlightPostTag?: string;

  @doc("A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting of suggestions is disabled.")
  highlightPreTag?: string;

  @doc("A number between 0 and 100 indicating the percentage of the index that must be covered by a suggestion query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80.")
  minimumCoverage?: float64;

  @doc("The comma-separated list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, or desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no $orderby is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses.")
  @encodedName("application/json", "orderby")
  orderBy?: string;

  @doc("The search text to use to suggest documents. Must be at least 1 character, and no more than 100 characters.")
  @encodedName("application/json", "search")
  searchText: string;

  @doc("The comma-separated list of field names to search for the specified search text. Target fields must be included in the specified suggester.")
  searchFields?: string;

  @doc("The comma-separated list of fields to retrieve. If unspecified, only the key field will be included in the results.")
  select?: string;

  @doc("The name of the suggester as specified in the suggesters collection that's part of the index definition.")
  suggesterName: string;

  @doc("The number of suggestions to retrieve. This must be a value between 1 and 100. The default is 5.")
  top?: int32;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Existing operation."
@tag("Documents")
@route("/docs")
interface Documents {
  @doc("Queries the number of documents in the index.")
  @get
  @route("$count")
  getCount(...ApiVersionParameter, ...ClientRequestIdParameter): int64 | SearchError;

  @doc("Searches for documents in the index.")
  @get
  getSearch(
    @doc("A full-text search query expression; Use \"*\" or omit this parameter to match all documents.")
    @query("search")
    searchText?: string,

    @doc("A value that specifies whether to fetch the total count of results. Default is false. Setting this value to true may have a performance impact. Note that the count returned is an approximation.")
    @query("$count")
    includeTotalResultCount?: boolean,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of facet expressions to apply to the search query. Each facet expression contains a field name, optionally followed by a comma-separated list of name:value pairs.")
    @query({
      name: "facet",
      format: "multi",
    })
    facets?: string[], // ISSUE: Can't set collectionFormat: https://github.com/Azure/typespec-azure/issues/1031

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The OData $filter expression to apply to the search query.")
    @query
    $filter?: string,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of field names to use for hit highlights. Only searchable fields can be used for hit highlighting.")
    @query({
      name: "highlight",
      format: "multi",
    })
    highlightFields?: string[],

    @doc("A string tag that is appended to hit highlights. Must be set with highlightPreTag. Default is &lt;/em&gt;.")
    @query
    highlightPostTag?: string,

    @doc("A string tag that is prepended to hit highlights. Must be set with highlightPostTag. Default is &lt;em&gt;.")
    @query
    highlightPreTag?: string,

    @doc("A number between 0 and 100 indicating the percentage of the index that must be covered by a search query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 100.")
    @query
    minimumCoverage?: float64,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, and desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no OrderBy is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses.")
    @query({
      name: "$orderBy",
      format: "multi",
    })
    orderBy?: string[],

    @doc("A value that specifies the syntax of the search query. The default is 'simple'. Use 'full' if your query uses the Lucene query syntax.")
    @query
    queryType?: QueryType,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of parameter values to be used in scoring functions (for example, referencePointParameter) using the format name-values. For example, if the scoring profile defines a function with a parameter called 'mylocation' the parameter string would be \"mylocation--122.2,44.8\" (without the quotes).")
    @query({
      name: "scoringParameter",
      format: "multi",
    })
    scoringParameters?: string[], // ISSUE: Can't set collectionFormat: https://github.com/Azure/typespec-azure/issues/1031

    @doc("The name of a scoring profile to evaluate match scores for matching documents in order to sort the results.")
    @query
    scoringProfile?: string,

    @doc("The name of the semantic configuration that lists which fields should be used for semantic ranking, captions, highlights, and answers")
    @query
    semanticConfiguration?: string,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of field names to which to scope the full-text search. When using fielded search (fieldName:searchExpression) in a full Lucene query, the field names of each fielded search expression take precedence over any field names listed in this parameter.")
    @query({
      format: "multi",
    })
    searchFields?: string[],

    @doc("The language of the query.")
    @query
    queryLanguage?: QueryLanguage,

    @doc("Improve search recall by spell-correcting individual search query terms.")
    @query
    speller?: QuerySpellerType,

    @doc("This parameter is only valid if the query type is 'semantic'. If set, the query returns answers extracted from key passages in the highest ranked documents. The number of answers returned can be configured by appending the pipe character '|' followed by the 'count-<number of answers>' option after the answers parameter value, such as 'extractive|count-3'. Default count is 1.")
    @query
    answers?: QueryAnswerType,

    @doc("A value that specifies whether any or all of the search terms must be matched in order to count the document as a match.")
    @query
    searchMode?: SearchMode,

    @doc("A value that specifies whether we want to calculate scoring statistics (such as document frequency) globally for more consistent scoring, or locally, for lower latency.")
    @query
    scoringStatistics?: ScoringStatistics,

    @doc("A value to be used to create a sticky session, which can help to get more consistent results. As long as the same sessionId is used, a best-effort attempt will be made to target the same replica set. Be wary that reusing the same sessionID values repeatedly can interfere with the load balancing of the requests across replicas and adversely affect the performance of the search service. The value used as sessionId cannot start with a '_' character.")
    @query
    sessionId?: string,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The list of fields to retrieve. If unspecified, all fields marked as retrievable in the schema are included.")
    @query({
      format: "multi",
    })
    $select?: string[],

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The number of search results to skip. This value cannot be greater than 100,000. If you need to scan documents in sequence, but cannot use $skip due to this limitation, consider using $orderby on a totally-ordered key and $filter with a range query instead.")
    @query
    $skip?: int32,

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The number of search results to retrieve. This can be used in conjunction with $skip to implement client-side paging of search results. If results are truncated due to server-side paging, the response will include a continuation token that can be used to issue another Search request for the next page of results.")
    @query
    $top?: int32,

    @doc("This parameter is only valid if the query type is 'semantic'. If set, the query returns captions extracted from key passages in the highest ranked documents. When Captions is set to 'extractive', highlighting is enabled by default, and can be configured by appending the pipe character '|' followed by the 'highlight-<true/false>' option, such as 'extractive|highlight-true'. Defaults to 'None'.")
    @query
    captions?: QueryCaptionType,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of field names used for semantic search.")
    @query({
      format: "multi",
    })
    semanticFields?: string[],

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): SearchDocumentsResult | SearchError;

  @doc("Autocompletes incomplete query terms based on input text and matching terms in the index.")
  @post
  @route("search.post.search")
  searchPost(
    @doc("The definition of the Search request.")
    @body
    searchRequest: SearchRequest,

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): SearchDocumentsResult | SearchError;

  @doc("Autocompletes incomplete query terms based on input text and matching terms in the index.")
  @get
  @route("search.autocomplete")
  getAutocomplete(
    @doc("The incomplete term which should be auto-completed.")
    @query
    search: string,

    @doc("The name of the suggester as specified in the suggesters collection that's part of the index definition.")
    @query
    suggesterName: string,

    @doc("Specifies the mode for Autocomplete. The default is 'oneTerm'. Use 'twoTerms' to get shingles and 'oneTermWithContext' to use the current context while producing auto-completed terms.")
    @query
    autocompleteMode?: AutocompleteMode,

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("An OData expression that filters the documents used to produce completed terms for the Autocomplete result.")
    @query
    $filter?: string,

    @doc("A value indicating whether to use fuzzy matching for the autocomplete query. Default is false. When set to true, the query will find terms even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy autocomplete queries are slower and consume more resources.")
    @query
    fuzzy?: boolean,

    @doc("A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting is disabled.")
    @query
    highlightPostTag?: string,

    @doc("A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting is disabled.")
    @query
    highlightPreTag?: string,

    @doc("A number between 0 and 100 indicating the percentage of the index that must be covered by an autocomplete query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80.")
    @query
    minimumCoverage?: float64,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of field names to consider when querying for auto-completed terms. Target fields must be included in the specified suggester.")
    @query({
      format: "multi",
    })
    searchFields?: string[],

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The number of auto-completed terms to retrieve. This must be a value between 1 and 100. The default is 5.")
    @query
    $top?: int32,

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): AutocompleteResult | SearchError;

  @doc("Autocompletes incomplete query terms based on input text and matching terms in the index.")
  @post
  @route("search.post.autocomplete")
  autocompletePost(
    @doc("The definition of the Autocomplete request.")
    @body
    autocompleteRequest: AutocompleteRequest,

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): AutocompleteResult | SearchError;

  @doc("Sends a batch of document write actions to the index.")
  @post
  @route("search.index")
  index(
    @doc("The batch of index actions.")
    @body
    batch: IndexBatch,

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): IndexDocumentsResult | {
    @statusCode statusCode: 207;
    @body body: IndexDocumentsResult;
  } | SearchError;

  @doc("Suggests documents in the index that match the given partial query text.")
  @get
  @route("search.suggest")
  getSuggestion(
    @doc("The search text to use to suggest documents. Must be at least 1 character, and no more than 100 characters.")
    @query("search")
    searchText: string,

    @doc("The name of the suggester as specified in the suggesters collection that's part of the index definition.")
    @query
    suggesterName: string,

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("An OData expression that filters the documents considered for suggestions.")
    @query
    $filter?: string,

    @doc("A value indicating whether to use fuzzy matching for the suggestions query. Default is false. When set to true, the query will find terms even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy suggestions queries are slower and consume more resources.")
    @query("fuzzy")
    useFuzzyMatching?: boolean,

    @doc("A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting of suggestions is disabled.")
    @query
    highlightPostTag?: string,

    @doc("A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting of suggestions is disabled.")
    @query
    highlightPreTag?: string,

    @doc("A number between 0 and 100 indicating the percentage of the index that must be covered by a suggestions query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80.")
    @query
    minimumCoverage?: float64,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, or desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no $orderby is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses.")
    @query({
      name: "$orderby",
      format: "multi",
    })
    orderBy?: string[],

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("The list of field names to search for the specified search text. Target fields must be included in the specified suggester.")
    @query({
      format: "multi",
    })
    searchFields?: string[],

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The list of fields to retrieve. If unspecified, only the key field will be included in the results.")
    @query
    $select?: string,

    #suppress "@azure-tools/typespec-azure-core/casing-style" "Existing operation."
    @doc("The number of suggestions to retrieve. The value must be a number between 1 and 100. The default is 5.")
    @query
    $top?: int32,

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): SuggestDocumentsResult | SearchError;

  @doc("Search post suggest.")
  @post
  @route("search.post.suggest")
  suggestPost(
    @doc("The Suggest request.")
    @body
    suggestRequest: SuggestRequest,

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): SuggestDocumentsResult | SearchError;
}

// ISSUE: Can't respond with empty object: https://github.com/Azure/typespec-azure/issues/1122.
// They probably meant to have additionalProperties here? Surely this doesn't literally return `{}` always?
@tag("Documents")
@route("/docs('{key}')")
interface DocumentsByKey {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Existing service."
  @doc("Retrieves a document from the index.")
  @get
  get(
    @doc("The key")
    @path
    key: string,

    #suppress "@azure-tools/typespec-azure-core/prefer-csv-collection-format" "Existing service"
    @doc("Selected fields")
    @query({
      name: "$select",
      format: "multi",
    })
    selectedFields: string[],

    ...ApiVersionParameter,
    ...ClientRequestIdParameter,
  ): Body<{}> | SearchError;
}
