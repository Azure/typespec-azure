import "./searchservice.models.tsp";

// cspell:ignore Bangla Bokmaal Bokmål kstem Sorani Decompounder TFIDF

using TypeSpec.OpenAPI;
using TypeSpec.Rest;

namespace Azure.SearchService;

@doc("Represents a search index definition, which describes the fields and search behavior of an index.")
model SearchIndex {
  ...ETag;

  @doc("The name of the index.")
  name: string;

  @doc("The fields of the index.")
  fields: SearchField[];

  @doc("The scoring profiles for the index.")
  scoringProfiles?: ScoringProfile[];

  @doc("The name of the scoring profile to use if none is specified in the query. If this property is not set and no scoring profile is specified in the query, then default scoring (tf-idf) will be used.")
  defaultScoringProfile?: string;

  @doc("Options to control Cross-Origin Resource Sharing (CORS) for the index.")
  corsOptions?: CorsOptions;

  @doc("The suggesters for the index.")
  suggesters?: Suggester;

  @doc("The analyzers for the index.")
  analyzers?: LexicalAnalyzer;

  @doc("The tokenizers for the index.")
  tokenizers?: LexicalTokenizer;

  @doc("The token filters for the index.")
  tokenFilter?: TokenFilter;

  @doc("The character filters for the index.")
  charFilters?: CharFilter;

  @doc("The normalizers for the index.")
  normalizers?: LexicalNormalizer;

  @doc("A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your data when you want full assurance that no one, not even Microsoft, can decrypt your data in Azure Cognitive Search. Once you have encrypted your data, it will always remain encrypted. Azure Cognitive Search will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your data will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019.")
  encryptionKey?: SearchResourceEncryptionKey;

  @doc("The type of similarity algorithm to be used when scoring and ranking the documents matching a search query. The similarity algorithm can only be defined at index creation time and cannot be modified on existing indexes. If null, the ClassicSimilarity algorithm is used.")
  similarity?: Similarity;

  @doc("Defines parameters for a search index that influence semantic capabilities.")
  semantic?: SemanticSettings;
}

@doc("Represents a field in an index definition, which describes the name, data type, and search behavior of a field.")
model SearchField {
  @doc("The name of the field, which must be unique within the fields collection of the index or parent field.")
  name: string;

  @doc("The data type of the field.")
  type: SearchFieldDataType;

  @doc("A value indicating whether the field uniquely identifies documents in the index. Exactly one top-level field in each index must be chosen as the key field and it must be of type Edm.String. Key fields can be used to look up documents directly and update or delete specific documents. Default is false for simple fields and null for complex fields.")
  key?: boolean;

  @doc("A value indicating whether the field can be returned in a search result. You can disable this option if you want to use a field (for example, margin) as a filter, sorting, or scoring mechanism but do not want the field to be visible to the end user. This property must be true for key fields, and it must be null for complex fields. This property can be changed on existing fields. Enabling this property does not cause any increase in index storage requirements. Default is true for simple fields and null for complex fields.")
  retrievable?: boolean;

  @doc("A value indicating whether the field is full-text searchable. This means it will undergo analysis such as word-breaking during indexing. If you set a searchable field to a value like \"sunny day\", internally it will be split into the individual tokens \"sunny\" and \"day\". This enables full-text searches for these terms. Fields of type Edm.String or Collection(Edm.String) are searchable by default. This property must be false for simple fields of other non-string data types, and it must be null for complex fields. Note: searchable fields consume extra space in your index since Azure Cognitive Search will store an additional tokenized version of the field value for full-text searches. If you want to save space in your index and you don't need a field to be included in searches, set searchable to false.")
  searchable?: boolean;

  @doc("A value indicating whether to enable the field to be referenced in $filter queries. filterable differs from searchable in how strings are handled. Fields of type Edm.String or Collection(Edm.String) that are filterable do not undergo word-breaking, so comparisons are for exact matches only. For example, if you set such a field f to \"sunny day\", $filter=f eq 'sunny' will find no matches, but $filter=f eq 'sunny day' will. This property must be null for complex fields. Default is true for simple fields and null for complex fields.")
  filterable?: boolean;

  @doc("A value indicating whether to enable the field to be referenced in $orderby expressions. By default Azure Cognitive Search sorts results by score, but in many experiences users will want to sort by fields in the documents. A simple field can be sortable only if it is single-valued (it has a single value in the scope of the parent document). Simple collection fields cannot be sortable, since they are multi-valued. Simple sub-fields of complex collections are also multi-valued, and therefore cannot be sortable. This is true whether it's an immediate parent field, or an ancestor field, that's the complex collection. Complex fields cannot be sortable and the sortable property must be null for such fields. The default for sortable is true for single-valued simple fields, false for multi-valued simple fields, and null for complex fields.")
  sortable?: boolean;

  @doc("A value indicating whether to enable the field to be referenced in facet queries. Typically used in a presentation of search results that includes hit count by category (for example, search for digital cameras and see hits by brand, by megapixels, by price, and so on). This property must be null for complex fields. Fields of type Edm.GeographyPoint or Collection(Edm.GeographyPoint) cannot be facetable. Default is true for all other simple fields.")
  facetable?: boolean;

  @doc("The name of the analyzer to use for the field. This option can be used only with searchable fields and it can't be set together with either searchAnalyzer or indexAnalyzer. Once the analyzer is chosen, it cannot be changed for the field. Must be null for complex fields.")
  analyzer?: LexicalAnalyzerName;

  @doc("The name of the analyzer used at search time for the field. This option can be used only with searchable fields. It must be set together with indexAnalyzer and it cannot be set together with the analyzer option. This property cannot be set to the name of a language analyzer; use the analyzer property instead if you need a language analyzer. This analyzer can be updated on an existing field. Must be null for complex fields.")
  searchAnalyzer?: LexicalAnalyzerName;

  @doc("The name of the analyzer used at indexing time for the field. This option can be used only with searchable fields. It must be set together with searchAnalyzer and it cannot be set together with the analyzer option.  This property cannot be set to the name of a language analyzer; use the analyzer property instead if you need a language analyzer. Once the analyzer is chosen, it cannot be changed for the field. Must be null for complex fields.")
  indexAnalyzer?: LexicalAnalyzerName;

  @doc("The name of the normalizer to use for the field. This option can be used only with fields with filterable, sortable, or facetable enabled. Once the normalizer is chosen, it cannot be changed for the field. Must be null for complex fields.")
  normalizer?: LexicalNormalizerName;

  @doc("A list of the names of synonym maps to associate with this field. This option can be used only with searchable fields. Currently only one synonym map per field is supported. Assigning a synonym map to a field ensures that query terms targeting that field are expanded at query-time using the rules in the synonym map. This attribute can be changed on existing fields. Must be null or an empty collection for complex fields.")
  synonymMaps: string[];

  @doc("A list of sub-fields if this is a field of type Edm.ComplexType or Collection(Edm.ComplexType). Must be null or empty for simple fields.")
  fields?: SearchField[];
}

@doc("Defines the data type of a field in a search index.")
enum SearchFieldDataType {
  @doc("Indicates that a field contains a string.")
  String: "Edm.String",

  @doc("Indicates that a field contains a 32-bit signed integer.")
  Int32: "Edm.Int32",

  @doc("Indicates that a field contains a 64-bit signed integer.")
  Int64: "Edm.Int64",

  @doc("Indicates that a field contains an IEEE double-precision floating point number.")
  Double: "Edm.Double",

  @doc("Indicates that a field contains a Boolean value (true or false).")
  Boolean: "Edm.Boolean",

  @doc("Indicates that a field contains a date/time value, including timezone information.")
  DateTimeOffset: "Edm.DateTimeOffset",

  @doc("Indicates that a field contains a geo-location in terms of longitude and latitude.")
  GeographyPoint: "Edm.GeographyPoint",

  @doc("Indicates that a field contains one or more complex objects that in turn have sub-fields of other types.")
  ComplexType: "Edm.ComplexType",
}

@doc("Defines the names of all text analyzers supported by Azure Cognitive Search.")
enum LexicalAnalyzerName {
  @doc("Microsoft analyzer for Arabic.")
  ArMicrosoft: "ar.microsoft",

  @doc("Lucene analyzer for Arabic.")
  ArLucene: "ar.lucene",

  @doc("Lucene analyzer for Armenian.")
  HyLucene: "hy.lucene",

  @doc("Microsoft analyzer for Bangla.")
  BnMicrosoft: "bn.microsoft",

  @doc("Lucene analyzer for Basque.")
  EuLucene: "eu.lucene",

  @doc("Microsoft analyzer for Bulgarian.")
  BgMicrosoft: "bg.microsoft",

  @doc("Lucene analyzer for Bulgarian.")
  BgLucene: "bg.lucene",

  @doc("Microsoft analyzer for Catalan.")
  CaMicrosoft: "ca.microsoft",

  @doc("Lucene analyzer for Catalan.")
  CaLucene: "ca.lucene",

  @doc("Microsoft analyzer for Chinese (Simplified).")
  ZhHansMicrosoft: "zh-Hans.microsoft",

  @doc("Lucene analyzer for Chinese (Simplified).")
  ZhHansLucene: "zh-Hans.lucene",

  @doc("Microsoft analyzer for Chinese (Traditional).")
  ZhHantMicrosoft: "zh-Hant.microsoft",

  @doc("Lucene analyzer for Chinese (Traditional).")
  ZhHantLucene: "zh-Hant.lucene",

  @doc("Microsoft analyzer for Croatian.")
  HrMicrosoft: "hr.microsoft",

  @doc("Microsoft analyzer for Czech.")
  CsMicrosoft: "cs.microsoft",

  @doc("Lucene analyzer for Czech.")
  CsLucene: "cs.lucene",

  @doc("Microsoft analyzer for Danish.")
  DaMicrosoft: "da.microsoft",

  @doc("Lucene analyzer for Danish.")
  DaLucene: "da.lucene",

  @doc("Microsoft analyzer for Dutch.")
  NlMicrosoft: "nl.microsoft",

  @doc("Lucene analyzer for Dutch.")
  NlLucene: "nl.lucene",

  @doc("Microsoft analyzer for English.")
  EnMicrosoft: "en.microsoft",

  @doc("Lucene analyzer for English.")
  EnLucene: "en.lucene",

  @doc("Microsoft analyzer for Estonian.")
  EtMicrosoft: "et.microsoft",

  @doc("Microsoft analyzer for Finnish.")
  FiMicrosoft: "fi.microsoft",

  @doc("Lucene analyzer for Finnish.")
  FiLucene: "fi.lucene",

  @doc("Microsoft analyzer for French.")
  FrMicrosoft: "fr.microsoft",

  @doc("Lucene analyzer for French.")
  FrLucene: "fr.lucene",

  @doc("Lucene analyzer for Galician.")
  GlLucene: "gl.lucene",

  @doc("Microsoft analyzer for German.")
  DeMicrosoft: "de.microsoft",

  @doc("Lucene analyzer for German.")
  DeLucene: "de.lucene",

  @doc("Microsoft analyzer for Greek.")
  ElMicrosoft: "el.microsoft",

  @doc("Lucene analyzer for Greek.")
  ElLucene: "el.lucene",

  @doc("Microsoft analyzer for Gujarati.")
  GuMicrosoft: "gu.microsoft",

  @doc("Microsoft analyzer for Hebrew.")
  HeMicrosoft: "he.microsoft",

  @doc("Microsoft analyzer for Hindi.")
  HiMicrosoft: "hi.microsoft",

  @doc("Lucene analyzer for Hindi.")
  HiLucene: "hi.lucene",

  @doc("Microsoft analyzer for Hungarian.")
  HuMicrosoft: "hu.microsoft",

  @doc("Lucene analyzer for Hungarian.")
  HuLucene: "hu.lucene",

  @doc("Microsoft analyzer for Icelandic.")
  IsMicrosoft: "is.microsoft",

  @doc("Microsoft analyzer for Indonesian (Bahasa).")
  IdMicrosoft: "id.microsoft",

  @doc("Lucene analyzer for Indonesian.")
  IdLucene: "id.lucene",

  @doc("Lucene analyzer for Irish.")
  GaLucene: "ga.lucene",

  @doc("Microsoft analyzer for Italian.")
  ItMicrosoft: "it.microsoft",

  @doc("Lucene analyzer for Italian.")
  ItLucene: "it.lucene",

  @doc("Microsoft analyzer for Japanese.")
  JaMicrosoft: "ja.microsoft",

  @doc("Lucene analyzer for Japanese.")
  JaLucene: "ja.lucene",

  @doc("Microsoft analyzer for Kannada.")
  KnMicrosoft: "kn.microsoft",

  @doc("Microsoft analyzer for Korean.")
  KoMicrosoft: "ko.microsoft",

  @doc("Lucene analyzer for Korean.")
  KoLucene: "ko.lucene",

  @doc("Microsoft analyzer for Latvian.")
  LvMicrosoft: "lv.microsoft",

  @doc("Lucene analyzer for Latvian.")
  LvLucene: "lv.lucene",

  @doc("Microsoft analyzer for Lithuanian.")
  LtMicrosoft: "lt.microsoft",

  @doc("Microsoft analyzer for Malayalam.")
  MlMicrosoft: "ml.microsoft",

  @doc("Microsoft analyzer for Malay (Latin).")
  MsMicrosoft: "ms.microsoft",

  @doc("Microsoft analyzer for Marathi.")
  MrMicrosoft: "mr.microsoft",

  @doc("Microsoft analyzer for Norwegian (Bokmål).")
  NbMicrosoft: "nb.microsoft",

  @doc("Lucene analyzer for Norwegian.")
  NoLucene: "no.lucene",

  @doc("Lucene analyzer for Persian.")
  FaLucene: "fa.lucene",

  @doc("Microsoft analyzer for Polish.")
  PlMicrosoft: "pl.microsoft",

  @doc("Lucene analyzer for Polish.")
  PlLucene: "pl.lucene",

  @doc("Microsoft analyzer for Portuguese (Brazil).")
  PtBrMicrosoft: "pt-BR.microsoft",

  @doc("Lucene analyzer for Portuguese (Brazil).")
  PtBrLucene: "pt-BR.lucene",

  @doc("Microsoft analyzer for Portuguese (Portugal).")
  PtPtMicrosoft: "pt-PT.microsoft",

  @doc("Lucene analyzer for Portuguese (Portugal).")
  PtPtLucene: "pt-PT.lucene",

  @doc("Microsoft analyzer for Punjabi.")
  PaMicrosoft: "pa.microsoft",

  @doc("Microsoft analyzer for Romanian.")
  RoMicrosoft: "ro.microsoft",

  @doc("Lucene analyzer for Romanian.")
  RoLucene: "ro.lucene",

  @doc("Microsoft analyzer for Russian.")
  RuMicrosoft: "ru.microsoft",

  @doc("Lucene analyzer for Russian.")
  RuLucene: "ru.lucene",

  @doc("Microsoft analyzer for Serbian (Cyrillic).")
  SrCyrillicMicrosoft: "sr-cyrillic.microsoft",

  @doc("Microsoft analyzer for Serbian (Latin).")
  SrLatinMicrosoft: "sr-latin.microsoft",

  @doc("Microsoft analyzer for Slovak.")
  SkMicrosoft: "sk.microsoft",

  @doc("Microsoft analyzer for Slovenian.")
  SlMicrosoft: "sl.microsoft",

  @doc("Microsoft analyzer for Spanish.")
  EsMicrosoft: "es.microsoft",

  @doc("Lucene analyzer for Spanish.")
  EsLucene: "es.lucene",

  @doc("Microsoft analyzer for Swedish.")
  SvMicrosoft: "sv.microsoft",

  @doc("Lucene analyzer for Swedish.")
  SvLucene: "sv.lucene",

  @doc("Microsoft analyzer for Tamil.")
  TaMicrosoft: "ta.microsoft",

  @doc("Microsoft analyzer for Telugu.")
  TeMicrosoft: "te.microsoft",

  @doc("Microsoft analyzer for Thai.")
  ThMicrosoft: "th.microsoft",

  @doc("Lucene analyzer for Thai.")
  ThLucene: "th.lucene",

  @doc("Microsoft analyzer for Turkish.")
  TrMicrosoft: "tr.microsoft",

  @doc("Lucene analyzer for Turkish.")
  TrLucene: "tr.lucene",

  @doc("Microsoft analyzer for Ukrainian.")
  UkMicrosoft: "uk.microsoft",

  @doc("Microsoft analyzer for Urdu.")
  UrMicrosoft: "ur.microsoft",

  @doc("Microsoft analyzer for Vietnamese.")
  ViMicrosoft: "vi.microsoft",

  @doc("Standard Lucene analyzer.")
  StandardLucene: "standard.lucene",

  @doc("Standard ASCII Folding Lucene analyzer. See https://docs.microsoft.com/rest/api/searchservice/Custom-analyzers-in-Azure-Search#Analyzers")
  StandardAsciiFoldingLucene: "standardasciifolding.lucene",

  @doc("Treats the entire content of a field as a single token. This is useful for data like zip codes, ids, and some product names. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/KeywordAnalyzer.html")
  Keyword: "keyword",

  @doc("Flexibly separates text into terms via a regular expression pattern. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/PatternAnalyzer.html")
  Pattern: "pattern",

  @doc("Divides text at non-letters and converts them to lower case. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/SimpleAnalyzer.html")
  Simple: "simple",

  @doc("Divides text at non-letters; Applies the lowercase and stopword token filters. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/StopAnalyzer.html")
  Stop: "stop",

  @doc("An analyzer that uses the whitespace tokenizer. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/WhitespaceAnalyzer.html")
  Whitespace: "whitespace",
}

@doc("Defines parameters for a search index that influence scoring in search queries.")
model ScoringProfile {
  @doc("The name of the scoring profile.")
  name: string;

  @doc("Parameters that boost scoring based on text matches in certain index fields.")
  text?: TextWeights;

  @doc("The collection of functions that influence the scoring of documents.")
  functions?: ScoringFunction[];

  @doc("A value indicating how the results of individual scoring functions should be combined. Defaults to \"Sum\". Ignored if there are no scoring functions.")
  functionAggregation?: ScoringFunctionAggregation;
}

@doc("Defines weights on index fields for which matches should boost scoring in search queries.")
model TextWeights {
  @doc("The dictionary of per-field weights to boost document scoring. The keys are field names and the values are the weights for each field.")
  weights: Record<float64>;
}

@doc("Base type for functions that can modify document scores during ranking.")
@discriminator("type")
model ScoringFunction {
  @doc("The name of the field used as input to the scoring function.")
  fieldName: string;

  @doc("A multiplier for the raw score. Must be a positive number not equal to 1.0.")
  boost: float64;

  @doc("A value indicating how boosting will be interpolated across document scores; defaults to \"Linear\".")
  interpolation?: ScoringFunctionInterpolation;
}

@doc("Defines a function that boosts scores based on distance from a geographic location.")
model DistanceScoringFunction extends ScoringFunction {
  type: "distance";

  @doc("Parameter values for the distance scoring function.")
  distance: DistanceScoringParameters;
}

@doc("Provides parameter values to a distance scoring function.")
model DistanceScoringParameters {
  @doc("The name of the parameter passed in search queries to specify the reference location.")
  referencePointParameter: string;

  @doc("The distance in kilometers from the reference location where the boosting range ends.")
  boostingDistance: float64;
}

@doc("Defines a function that boosts scores based on the value of a date-time field.")
model FreshnessScoringFunction extends ScoringFunction {
  type: "freshness";

  @doc("Parameter values for the freshness scoring function.")
  freshness: FreshnessScoringParameters;
}

@doc("Provides parameter values to a freshness scoring function.")
model FreshnessScoringParameters {
  @doc("The expiration period after which boosting will stop for a particular document.")
  boostingDuration: duration;
}

@doc("Defines a function that boosts scores based on the magnitude of a numeric field.")
model MagnitudeScoringFunction extends ScoringFunction {
  type: "magnitude";

  @doc("Parameter values for the magnitude scoring function.")
  magnitude: MagnitudeScoringParameters;
}

@doc("Provides parameter values to a magnitude scoring function.")
model MagnitudeScoringParameters {
  @doc("The field value at which boosting stgarts.")
  boostingRangeStart: float64;

  @doc("The field value at which boosting ends.")
  boostingRangeEnd: float64;

  @doc("A value indicating whether to apply a constant boost for field values beyond the range end value; default is false.")
  constantBoostBeyondRange?: boolean;
}

@doc("Defines a function that boosts scores of documents with string values matching a given list of tags.")
model TagScoringFunction extends ScoringFunction {
  type: "tag";

  @doc("Parameter values for the tag scoring function.")
  tag: TagScoringParameters;
}

@doc("Provides parameter values to a tag scoring function.")
model TagScoringParameters {
  @doc("The name of the parameter passed in search queries to specify the list of tags to compare against the target field.")
  tagsParameter: string;
}

@doc("Defines the function used to interpolate score boosting across a range of documents.")
enum ScoringFunctionInterpolation {
  @doc("Boosts scores by a linearly decreasing amount. This is the default interpolation for scoring functions.")
  Linear: "linear",

  @doc("Boosts scores by a constant factor.")
  Constant: "constant",

  @doc("Boosts scores by an amount that decreases quadratically. Boosts decrease slowly for higher scores, and more quickly as the scores decrease. This interpolation option is not allowed in tag scoring functions.")
  Quadratic: "quadratic",

  @doc("Boosts scores by an amount that decreases logarithmically. Boosts decrease quickly for higher scores, and more slowly as the scores decrease. This interpolation option is not allowed in tag scoring functions.")
  Logarithmic: "logarithmic",
}

@doc("Defines the aggregation function used to combine the results of all the scoring functions in a scoring profile.")
enum ScoringFunctionAggregation {
  @doc("Boost scores by the sum of all scoring function results.")
  Sum: "sum",

  @doc("Boost scores by the average of all scoring function results.")
  Average: "average",

  @doc("Boost scores by the minimum of all scoring function results.")
  Minimum: "minimum",

  @doc("Boost scores by the maximum of all scoring function results.")
  Maximum: "maximum",

  @doc("Boost scores using the first applicable scoring function in the scoring profile.")
  FirstMatching: "firstMatching",
}

@doc("Defines options to control Cross-Origin Resource Sharing (CORS) for an index.")
model CorsOptions {
  @doc("The list of origins from which JavaScript code will be granted access to your index. Can contain a list of hosts of the form {protocol}://{fully-qualified-domain-name}[:{port#}], or a single '*' to allow all origins (not recommended).")
  allowedOrigins: string[];

  @doc("The duration for which browsers should cache CORS preflight responses. Defaults to 5 minutes.")
  maxAgeInSeconds?: int64;
}

@doc("Defines how the Suggest API should apply to a group of fields in the index.")
model Suggester {
  @doc("The name of the suggester.")
  name: string;

  @doc("A value indicating the capabilities of the suggester.")
  searchMode: SuggesterSearchMode;

  @doc("The list of field names to which the suggester applies. Each field must be searchable.")
  sourceFields: string[];
}

@doc("A value indicating the capabilities of the suggester.")
enum SuggesterSearchMode {
  @doc("Matches consecutive whole terms and prefixes in a field. For example, for the field 'The fastest brown fox', the queries 'fast' and 'fastest brow' would both match.")
  AnalyzingInfixMatching: "analyzingInfixMatching",
}

@doc("Base type for analyzers.")
@discriminator("@odata.type")
model LexicalAnalyzer {
  @doc("The name of the analyzer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters.")
  name: string;
}

@doc("Allows you to take control over the process of converting text into indexable/searchable tokens. It's a user-defined configuration consisting of a single predefined tokenizer and one or more filters. The tokenizer is responsible for breaking text into tokens, and the filters for modifying tokens emitted by the tokenizer.")
model CustomAnalyzer extends LexicalAnalyzer {
  `@odata.type`: "#Microsoft.Azure.Search.CustomAnalyzer";

  @doc("The name of the tokenizer to use to divide continuous text into a sequence of tokens, such as breaking a sentence into words.")
  tokenizer: LexicalTokenizerName;

  @doc("A list of token filters used to filter out or modify the tokens generated by a tokenizer. For example, you can specify a lowercase filter that converts all characters to lowercase. The filters are run in the order in which they are listed.")
  tokenFilters?: TokenFilterName[];

  @doc("A list of character filters used to prepare input text before it is processed by the tokenizer. For instance, they can replace certain characters or symbols. The filters are run in the order in which they are listed.")
  charFilters?: CharFilterName[];
}

@doc("Flexibly separates text into terms via a regular expression pattern. This analyzer is implemented using Apache Lucene.")
model PatternAnalyzer extends LexicalAnalyzer {
  `@odata.type`: "#Microsoft.Azure.Search.PatternAnalyzer";

  @doc("A value indicating whether terms should be lower-cased. Default is true.")
  lowercase?: boolean = true;

  @doc("A regular expression pattern to match token separators. Default is an expression that matches one or more non-word characters.")
  pattern?: string = "\\W+";

  @doc("Regular expression flags.")
  flags?: RegexFlags;

  @doc("A list of stopwords.")
  stopwords: string[];
}

@doc("Standard Apache Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop filter.")
model LuceneStandardAnalyzer extends LexicalAnalyzer {
  `@odata.type`: "#Microsoft.Azure.Search.StandardAnalyzer";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;

  @doc("A list of stopwords.")
  stopwords?: string[];
}

@doc("Divides text at non-letters; Applies the lowercase and stopword token filters. This analyzer is implemented using Apache Lucene.")
model StopAnalyzer extends LexicalAnalyzer {
  `@odata.type`: "#Microsoft.Azure.Search.StopAnalyzer";

  @doc("A list of stopwords.")
  stopwords?: string[];
}

@doc("Defines the names of all tokenizers supported by Azure Cognitive Search.")
enum LexicalTokenizerName {
  @doc("Grammar-based tokenizer that is suitable for processing most European-language documents. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/ClassicTokenizer.html")
  Classic: "classic",

  @doc("Tokenize the input from an edge into n-grams of the given size(s). See https://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/EdgeNGramTokenizer.html")
  EdgeNGram: "edgeNGram",

  @doc("Emits the entire input as a single token. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/KeywordTokenizer.html")
  Keyword: "keyword_v2",

  @doc("Divides text at non-letters. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/LetterTokenizer.html")
  Letter: "letter",

  @doc("Divides text at non-letters and converts them to lower case. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/LowerCaseTokenizer.html")
  Lowercase: "lowercase",

  @doc("Divides text using language-specific rules.")
  MicrosoftLanguageTokenizer: "microsoft_language_tokenizer",

  @doc("Divides text using language-specific rules and reduces words to their base forms.")
  MicrosoftLanguageStemmingTokenizer: "microsoft_language_stemming_tokenizer",

  @doc("Tokenize the input into n-grams of the given size(s). See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/NGramTokenizer.html")
  NGram: "nGram",

  @doc("Tokenizer for path-like hierarchies. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/path/PathHierarchyTokenizer.html")
  PathHierarchy: "path_hierarchy_v2",

  @doc("Tokenizer that uses regex pattern matching to construct distinct tokens. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/pattern/PatternTokenizer.html")
  Pattern: "pattern",

  @doc("Standard Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop filter. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/StandardTokenizer.html")
  Standard: "standard_v2",

  @doc("Tokenize urls and emails as one token. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/UAX29URLEmailTokenizer.html")
  UaxUrlEmail: "uax_url_email",

  @doc("Divides text at whitespace. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/WhitespaceTokenizer.html")
  Whitespace: "whitespace",
}

@doc("Defines the names of all token filters supported by Azure Cognitive Search.")
enum TokenFilterName {
  @doc("A token filter that applies the Arabic normalizer to normalize the orthography. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ar/ArabicNormalizationFilter.html")
  ArabicNormalization: "arabic_normalization",

  @doc("Strips all characters after an apostrophe (including the apostrophe itself). See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/tr/ApostropheFilter.html")
  Apostrophe: "apostrophe",

  @doc("Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the \"Basic Latin\" Unicode block) into their ASCII equivalents, if such equivalents exist. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ASCIIFoldingFilter.html")
  Asciifolding: "asciifolding",

  @doc("Forms bigrams of CJK terms that are generated from the standard tokenizer. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/cjk/CJKBigramFilter.html")
  CjkBigram: "cjk_bigram",

  @doc("Normalizes CJK width differences. Folds fullwidth ASCII variants into the equivalent basic Latin, and half-width Katakana variants into the equivalent Kana. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/cjk/CJKWidthFilter.html")
  CjkWidth: "cjk_width",

  @doc("Removes English possessives, and dots from acronyms. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/ClassicFilter.html")
  Classic: "classic",

  @doc("Construct bigrams for frequently occurring terms while indexing. Single terms are still indexed too, with bigrams overlaid. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/commongrams/CommonGramsFilter.html")
  CommonGram: "common_grams",

  @doc("Generates n-grams of the given size(s) starting from the front or the back of an input token. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/EdgeNGramTokenFilter.html")
  EdgeNGram: "edgeNGram_v2",

  @doc("Removes elisions. For example, \"l'avion\" (the plane) will be converted to \"avion\" (plane). See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/util/ElisionFilter.html")
  Elision: "elision",

  @doc("Normalizes German characters according to the heuristics of the German2 snowball algorithm. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/de/GermanNormalizationFilter.html")
  GermanNormalization: "german_normalization",

  @doc("Normalizes text in Hindi to remove some differences in spelling variations. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/hi/HindiNormalizationFilter.html")
  HindiNormalization: "hindi_normalization",

  @doc("Normalizes the Unicode representation of text in Indian languages. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/in/IndicNormalizationFilter.html")
  IndicNormalization: "indic_normalization",

  @doc("Emits each incoming token twice, once as keyword and once as non-keyword. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/KeywordRepeatFilter.html")
  KeywordRepeat: "keyword_repeat",

  @doc("A high-performance kstem filter for English. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/en/KStemFilter.html")
  Kstem: "kstem",

  @doc("Removes words that are too long or too short. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/LengthFilter.html")
  Length: "length",

  @doc("Limits the number of tokens while indexing. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/LimitTokenCountFilter.html")
  Limit: "limit",

  @doc("Normalizes token text to lower case. See https://lucene.apache.org/core/6_6_1/analyzers-common/org/apache/lucene/analysis/core/LowerCaseFilter.html")
  Lowercase: "lowercase",

  @doc("Generates n-grams of the given size(s). See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/NGramTokenFilter.html")
  NGram: "nGram_v2",

  @doc("Applies normalization for Persian. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/fa/PersianNormalizationFilter.html")
  PersianNormalization: "persian_normalization",

  @doc("Create tokens for phonetic matches. See https://lucene.apache.org/core/4_10_3/analyzers-phonetic/org/apache/lucene/analysis/phonetic/package-tree.html")
  Phonetic: "phonetic",

  @doc("Uses the Porter stemming algorithm to transform the token stream. See http://tartarus.org/~martin/PorterStemmer")
  PorterStem: "porter_stem",

  @doc("Reverses the token string. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/reverse/ReverseStringFilter.html")
  Reverse: "reverse",

  @doc("Normalizes use of the interchangeable Scandinavian characters. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ScandinavianNormalizationFilter.html")
  ScandinavianNormalization: "scandinavian_normalization",

  @doc("Folds Scandinavian characters åÅäæÄÆ-&gt;a and öÖøØ-&gt;o. It also discriminates against use of double vowels aa, ae, ao, oe and oo, leaving just the first one. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ScandinavianFoldingFilter.html")
  ScandinavianFoldingNormalization: "scandinavian_folding",

  @doc("Creates combinations of tokens as a single token. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/shingle/ShingleFilter.html")
  Shingle: "shingle",

  @doc("A filter that stems words using a Snowball-generated stemmer. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/snowball/SnowballFilter.html")
  Snowball: "snowball",

  @doc("Normalizes the Unicode representation of Sorani text. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ckb/SoraniNormalizationFilter.html")
  SoraniNormalization: "sorani_normalization",

  @doc("Language specific stemming filter. See https://docs.microsoft.com/rest/api/searchservice/Custom-analyzers-in-Azure-Search#TokenFilters")
  Stemmer: "stemmer",

  @doc("Removes stop words from a token stream. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/StopFilter.html")
  Stopwords: "stopwords",

  @doc("Trims leading and trailing whitespace from tokens. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/TrimFilter.html")
  Trim: "trim",

  @doc("Truncates the terms to a specific length. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/TruncateTokenFilter.html")
  Truncate: "truncate",

  @doc("Filters out tokens with same text as the previous token. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/RemoveDuplicatesTokenFilter.html")
  Unique: "unique",

  @doc("Normalizes token text to upper case. See https://lucene.apache.org/core/6_6_1/analyzers-common/org/apache/lucene/analysis/core/UpperCaseFilter.html")
  Uppercase: "uppercase",

  @doc("Splits words into subwords and performs optional transformations on subword groups.")
  WordDelimiter: "word_delimiter",
}

@doc("Defines the names of all character filters supported by Azure Cognitive Search.")
enum CharFilterName {
  @doc("A character filter that attempts to strip out HTML constructs. See https://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/charfilter/HTMLStripCharFilter.html")
  HtmlStrip: "html_strip",
}

@doc("Defines flags that can be combined to control how regular expressions are used in the pattern analyzer and pattern tokenizer.")
enum RegexFlags {
  @doc("Enables canonical equivalence.")
  CanonEq: "CANON_EQ",

  @doc("Enables case-insensitive matching.")
  CaseInsensitive: "CASE_INSENSITIVE",

  @doc("Permits whitespace and comments in the pattern.")
  Comments: "COMMENTS",

  @doc("Enables dotall mode.")
  DotAll: "DOTALL",

  @doc("Enables literal parsing of the pattern.")
  Literal: "LITERAL",

  @doc("Enables multiline mode.")
  Multiline: "MULTILINE",

  @doc("Enables Unicode-aware case folding.")
  UnicodeCase: "UNICODE_CASE",

  @doc("Enables Unix lines mode.")
  UnixLines: "UNIX_LINES",
}

@doc("Base type for tokenizers.")
@discriminator("@odata.type")
model LexicalTokenizer {
  @doc("The name of the tokenizer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters.")
  name: string;
}

@doc("Grammar-based tokenizer that is suitable for processing most European-language documents. This tokenizer is implemented using Apache Lucene.")
model ClassicTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.ClassicTokenizer";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;
}

@doc("Tokenize the input from an edge into n-grams of the given size(s). This tokenizer is implemented using Apache Lucene.")
model EdgeNGramTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.EdgeNGramTokenizer";

  @doc("The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram.")
  @maxValue(300)
  minGram?: int32 = 1;

  @doc("The maximum n-gram length. Default is 2. Maximum is 300.")
  @maxValue(300)
  maxGram?: int32 = 2;

  @doc("Character classes to keep in the tokens.")
  tokenChars?: TokenCharacterKind[];
}

@doc("Represents classes of characters on which a token filter can operate.")
enum TokenCharacterKind {
  @doc("Keeps letters in tokens.")
  Letter: "letter",

  @doc("Keeps digits in tokens.")
  Digit: "digit",

  @doc("Keeps whitespace in tokens.")
  Whitespace: "whitespace",

  @doc("Keeps punctuation in tokens.")
  Punctuation: "punctuation",

  @doc("Keeps symbols in tokens.")
  Symbol: "symbol",
}

@doc("Emits the entire input as a single token. This tokenizer is implemented using Apache Lucene.")
model KeywordTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.KeywordTokenizer";

  @doc("The read buffer size in bytes. Default is 256.")
  bufferSize?: int32 = 256;
}

@doc("Emits the entire input as a single token. This tokenizer is implemented using Apache Lucene.")
model KeywordTokenizerV2 extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.KeywordTokenizerV2";

  @doc("The maximum token length. Default is 256. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;
}

@doc("Grammar-based tokenizer that is suitable for processing most European-language documents. This tokenizer is implemented using Apache Lucene.")
model MicrosoftLanguageTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.MicrosoftLanguageTokenizer";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;

  @doc("A value indicating how the tokenizer is used. Set to true if used as the search tokenizer, set to false if used as the indexing tokenizer. Default is false.")
  isSearchTokenizer?: boolean = false;

  @doc("The language to use. The default is English.")
  language?: MicrosoftTokenizerLanguage;
}

@doc("Lists the languages supported by the Microsoft language tokenizer.")
enum MicrosoftTokenizerLanguage {
  @doc("Selects the Microsoft tokenizer for Arabic.")
  Arabic: "arabic",

  @doc("Selects the Microsoft tokenizer for Bangla.")
  Bangla: "bangla",

  @doc("Selects the Microsoft tokenizer for Bulgarian.")
  Bulgarian: "bulgarian",

  @doc("Selects the Microsoft tokenizer for Catalan.")
  Catalan: "catalan",

  @doc("Selects the Microsoft tokenizer for Croatian.")
  Croatian: "croatian",

  @doc("Selects the Microsoft tokenizer for Czech.")
  Czech: "czech",

  @doc("Selects the Microsoft tokenizer for Danish.")
  Danish: "danish",

  @doc("Selects the Microsoft tokenizer for Dutch.")
  Dutch: "dutch",

  @doc("Selects the Microsoft tokenizer for English.")
  English: "english",

  @doc("Selects the Microsoft tokenizer for Finnish.")
  Finnish: "finnish",

  @doc("Selects the Microsoft tokenizer for French.")
  French: "french",

  @doc("Selects the Microsoft tokenizer for German.")
  German: "german",

  @doc("Selects the Microsoft tokenizer for Greek.")
  Greek: "greek",

  @doc("Selects the Microsoft tokenizer for Gujarati.")
  Gujarati: "gujarati",

  @doc("Selects the Microsoft tokenizer for Hebrew.")
  Hebrew: "hebrew",

  @doc("Selects the Microsoft tokenizer for Hindi.")
  Hindi: "hindi",

  @doc("Selects the Microsoft tokenizer for Hungarian.")
  Hungarian: "hungarian",

  @doc("Selects the Microsoft tokenizer for Icelandic.")
  Icelandic: "icelandic",

  @doc("Selects the Microsoft tokenizer for Indonesian.")
  Indonesian: "indonesian",

  @doc("Selects the Microsoft tokenizer for Italian.")
  Italian: "italian",

  @doc("Selects the Microsoft tokenizer for Kannada.")
  Kannada: "kannada",

  @doc("Selects the Microsoft tokenizer for Latvian.")
  Latvian: "latvian",

  @doc("Selects the Microsoft tokenizer for Lithuanian.")
  Lithuanian: "lithuanian",

  @doc("Selects the Microsoft tokenizer for Malay.")
  Malay: "malay",

  @doc("Selects the Microsoft tokenizer for Malayalam.")
  Malayalam: "malayalam",

  @doc("Selects the Microsoft tokenizer for Marathi.")
  Marathi: "marathi",

  @doc("Selects the Microsoft tokenizer for  Norwegian (Bokmål).")
  NorwegianBokmaal: "norwegianBokmaal",

  @doc("Selects the Microsoft tokenizer for Polish.")
  Polish: "polish",

  @doc("Selects the Microsoft tokenizer for Portuguese.")
  Portuguese: "portuguese",

  @doc("Selects the Microsoft tokenizer for Portuguese (Brazil).")
  PortugueseBrazilian: "portugueseBrazilian",

  @doc("Selects the Microsoft tokenizer for Punjabi.")
  Punjabi: "punjabi",

  @doc("Selects the Microsoft tokenizer for Romanian.")
  Romanian: "romanian",

  @doc("Selects the Microsoft tokenizer for Russian.")
  Russian: "russian",

  @doc("Selects the Microsoft tokenizer for Serbian (Cyrillic).")
  SerbianCyrillic: "serbianCyrillic",

  @doc("Selects the Microsoft tokenizer for Serbian (Latin).")
  SerbianLatin: "serbianLatin",

  @doc("Selects the Microsoft tokenizer for Slovak.")
  Slovak: "slovak",

  @doc("Selects the Microsoft tokenizer for Slovenian.")
  Slovenian: "slovenian",

  @doc("Selects the Microsoft tokenizer for Spanish.")
  Spanish: "spanish",

  @doc("Selects the Microsoft tokenizer for Swedish.")
  Swedish: "swedish",

  @doc("Selects the Microsoft tokenizer for Tamil.")
  Tamil: "tamil",

  @doc("Selects the Microsoft tokenizer for Telugu.")
  Telugu: "telugu",

  @doc("Selects the Microsoft tokenizer for Turkish.")
  Turkish: "turkish",

  @doc("Selects the Microsoft tokenizer for Ukrainian.")
  Ukrainian: "ukrainian",

  @doc("Selects the Microsoft tokenizer for Urdu.")
  Urdu: "urdu",
}

@doc("Divides text using language-specific rules and reduces words to their base forms.")
model MicrosoftLanguageStemmingTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.MicrosoftLanguageStemmingTokenizer";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;

  @doc("A value indicating how the tokenizer is used. Set to true if used as the search tokenizer, set to false if used as the indexing tokenizer. Default is false.")
  isSearchTokenizer?: boolean = false;

  @doc("The language to use. The default is English.")
  language?: MicrosoftStemmingTokenizerLanguage;
}

@doc("Lists the languages supported by the Microsoft language stemming  tokenizer.")
enum MicrosoftStemmingTokenizerLanguage {
  @doc("Selects the Microsoft stemming tokenizer for Bangla.")
  Bangla: "bangla",

  @doc("Selects the Microsoft stemming tokenizer for Bulgarian.")
  Bulgarian: "bulgarian",

  @doc("Selects the Microsoft stemming tokenizer for Catalan.")
  Catalan: "catalan",

  @doc("Selects the Microsoft stemming tokenizer for Chinese (Simplified).")
  ChineseSimplified: "chineseSimplified",

  @doc("Selects the Microsoft stemming tokenizer for Chinese (Traditional).")
  ChineseTraditional: "chineseTraditional",

  @doc("Selects the Microsoft stemming tokenizer for Croatian.")
  Croatian: "croatian",

  @doc("Selects the Microsoft stemming tokenizer for Czech.")
  Czech: "czech",

  @doc("Selects the Microsoft stemming tokenizer for Danish.")
  Danish: "danish",

  @doc("Selects the Microsoft stemming tokenizer for Dutch.")
  Dutch: "dutch",

  @doc("Selects the Microsoft stemming tokenizer for English.")
  English: "english",

  @doc("Selects the Microsoft stemming tokenizer for French.")
  French: "french",

  @doc("Selects the Microsoft stemming tokenizer for German.")
  German: "german",

  @doc("Selects the Microsoft stemming tokenizer for Greek.")
  Greek: "greek",

  @doc("Selects the Microsoft stemming tokenizer for Gujarati.")
  Gujarati: "gujarati",

  @doc("Selects the Microsoft stemming tokenizer for Hindi.")
  Hindi: "hindi",

  @doc("Selects the Microsoft stemming tokenizer for Icelandic.")
  Icelandic: "icelandic",

  @doc("Selects the Microsoft stemming tokenizer for Indonesian.")
  Indonesian: "indonesian",

  @doc("Selects the Microsoft stemming tokenizer for Italian.")
  Italian: "italian",

  @doc("Selects the Microsoft stemming tokenizer for Japanese.")
  Japanese: "japanese",

  @doc("Selects the Microsoft stemming tokenizer for Kannada.")
  Kannada: "kannada",

  @doc("Selects the Microsoft stemming tokenizer for Korean.")
  Korean: "korean",

  @doc("Selects the Microsoft stemming tokenizer for Malay.")
  Malay: "malay",

  @doc("Selects the Microsoft stemming tokenizer for Malayalam.")
  Malayalam: "malayalam",

  @doc("Selects the Microsoft stemming tokenizer for Marathi.")
  Marathi: "marathi",

  @doc("Selects the Microsoft stemming tokenizer for  Norwegian (Bokmål).")
  NorwegianBokmaal: "norwegianBokmaal",

  @doc("Selects the Microsoft stemming tokenizer for Polish.")
  Polish: "polish",

  @doc("Selects the Microsoft stemming tokenizer for Portuguese.")
  Portuguese: "portuguese",

  @doc("Selects the Microsoft stemming tokenizer for Portuguese (Brazil).")
  PortugueseBrazilian: "portugueseBrazilian",

  @doc("Selects the Microsoft stemming tokenizer for Punjabi.")
  Punjabi: "punjabi",

  @doc("Selects the Microsoft stemming tokenizer for Romanian.")
  Romanian: "romanian",

  @doc("Selects the Microsoft stemming tokenizer for Russian.")
  Russian: "russian",

  @doc("Selects the Microsoft stemming tokenizer for Serbian (Cyrillic).")
  SerbianCyrillic: "serbianCyrillic",

  @doc("Selects the Microsoft stemming tokenizer for Serbian (Latin).")
  SerbianLatin: "serbianLatin",

  @doc("Selects the Microsoft stemming tokenizer for Slovenian.")
  Slovenian: "slovenian",

  @doc("Selects the Microsoft stemming tokenizer for Spanish.")
  Spanish: "spanish",

  @doc("Selects the Microsoft stemming tokenizer for Swedish.")
  Swedish: "swedish",

  @doc("Selects the Microsoft stemming tokenizer for Tamil.")
  Tamil: "tamil",

  @doc("Selects the Microsoft stemming tokenizer for Telugu.")
  Telugu: "telugu",

  @doc("Selects the Microsoft stemming tokenizer for Thai.")
  Thai: "thai",

  @doc("Selects the Microsoft stemming tokenizer for Ukrainian.")
  Ukrainian: "ukrainian",

  @doc("Selects the Microsoft stemming tokenizer for Urdu.")
  Urdu: "urdu",

  @doc("Selects the Microsoft stemming tokenizer for Vietnamese.")
  Vietnamese: "vietnamese",
}

@doc("Tokenize the input into n-grams of the given size(s). This tokenizer is implemented using Apache Lucene.")
model NGramTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.NGramTokenizer";

  @doc("The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram.")
  @maxValue(300)
  minGram?: int32 = 1;

  @doc("The maximum n-gram length. Default is 2. Maximum is 300.")
  @maxValue(300)
  maxGram?: int32 = 2;

  @doc("Character classes to keep in the tokens.")
  tokenChars?: TokenCharacterKind[];
}

@doc("Tokenizer for path-like hierarchies. This tokenizer is implemented using Apache Lucene.")
model PathHierarchyTokenizerV2 extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.PathHierarchyTokenizerV2";

  @doc("The delimiter character to use. Default is \"/\".")
  @maxLength(1)
  delimiter?: string = "/";

  @doc("A value that, if set, replaces the delimiter character. Default is \"/\".")
  @maxLength(1)
  replacement?: string = "/";

  @doc("The maximum token length. Default and maximum is 300.")
  @maxValue(300)
  maxTokenLength?: int32 = 300;

  @doc("A value indicating whether to generate tokens in reverse order. Default is false.")
  // x-ms-client-name=ReverseTokenOrder
  reverse?: boolean;

  @doc("The number of initial tokens to skip. Default is 0.")
  skip?: int32 = 0;
}

@doc("Tokenizer that uses regex pattern matching to construct distinct tokens. This tokenizer is implemented using Apache Lucene.")
model PatternTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.PatternTokenizer";

  @doc("A regular expression pattern to match token separators. Default is an expression that matches one or more non-word characters.")
  pattern?: string = "\\W+";

  @doc("Regular expression flags.")
  flags?: RegexFlags;

  @doc("The zero-based ordinal of the matching group in the regular expression pattern to extract into tokens. Use -1 if you want to use the entire pattern to split the input into tokens, irrespective of matching groups. Default is -1.")
  group?: int32 = -1;
}

@doc("Breaks text following the Unicode Text Segmentation rules. This tokenizer is implemented using Apache Lucene.")
model LuceneStandardTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.StandardTokenizer";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;
}

@doc("Breaks text following the Unicode Text Segmentation rules. This tokenizer is implemented using Apache Lucene.")
model LuceneStandardTokenizerV2 extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.StandardTokenizerV2";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;
}

@doc("Tokenize urls and emails as one token. This tokenizer is implemented using Apache Lucene.")
model UaxUrlEmailTokenizer extends LexicalTokenizer {
  `@odata.type`: "#Microsoft.Azure.Search.UaxUrlEmailTokenizer";

  @doc("The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters.")
  @maxValue(300)
  maxTokenLength?: int32 = 255;
}

@doc("Base type for token filters.")
@discriminator("@odata.type")
model TokenFilter {
  @doc("The name of the token filter. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters.")
  name: string;
}

@doc("Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the \"Basic Latin\" Unicode block) into their ASCII equivalents, if such equivalents exist. This token filter is implemented using Apache Lucene.")
model AsciiFoldingTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.AsciiFoldingTokenFilter";

  @doc("A value indicating whether the original token will be kept. Default is false.")
  preserveOriginal?: boolean = false;
}

@doc("Scripts that can be ignored by CjkBigramTokenFilter.")
enum CjkBigramTokenFilterScripts {
  @doc("Ignore Han script when forming bigrams of CJK terms.")
  Han: "han",

  @doc("Ignore Hiragana script when forming bigrams of CJK terms.")
  Hiragana: "hiragana",

  @doc("Ignore Katakana script when forming bigrams of CJK terms.")
  Katakana: "katakana",

  @doc("Ignore Hangul script when forming bigrams of CJK terms.")
  Hangul: "hangul",
}

@doc("Forms bigrams of CJK terms that are generated from the standard tokenizer. This token filter is implemented using Apache Lucene.")
model CjkBigramTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.CjkBigramTokenFilter";

  @doc("The scripts to ignore.")
  ignoreScripts?: CjkBigramTokenFilterScripts[];

  @doc("Forms bigrams of CJK terms that are generated from the standard tokenizer. This token filter is implemented using Apache Lucene.")
  outputUnigrams?: boolean;
}

@doc("Construct bigrams for frequently occurring terms while indexing. Single terms are still indexed too, with bigrams overlaid. This token filter is implemented using Apache Lucene.")
model CommonGramTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.CommonGramTokenFilter";

  @doc("The set of common words.")
  commonWords: string[];

  @doc("A value indicating whether common words matching will be case insensitive. Default is false.")
  ignoreCase?: boolean = false;

  @doc("A value that indicates whether the token filter is in query mode. When in query mode, the token filter generates bigrams and then removes common words and single terms followed by a common word. Default is false.")
  @projectedName("json", "queryMode")
  useQueryMode?: boolean;
}

@doc("Decomposes compound words found in many Germanic languages. This token filter is implemented using Apache Lucene.")
model DictionaryDecompounderTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.DictionaryDecompounderTokenFilter";

  @doc("The list of words to match against.")
  wordList: string[];

  @doc("The minimum word size. Only words longer than this get processed. Default is 5. Maximum is 300.")
  @maxValue(300)
  minWordSize?: int32 = 5;

  @doc("The minimum subword size. Only words longer than this get processed. Default is 5. Maximum is 300.")
  @maxValue(300)
  minSubwordSize?: int32 = 2;

  @doc("The maximum subword size. Only words longer than this get processed. Default is 5. Maximum is 300.")
  @maxValue(300)
  maxSubwordSize?: int32 = 15;

  @doc("A value indicating whether to add only the longest matching subword to the output. Default is false.")
  onlyLongestMatch?: boolean = false;
}

@doc("Specifies which side of the input an n-gram should be generated from.")
enum EdgeNGramTokenFilterSide {
  @doc("Specifies that the n-gram should be generated from the front of the input.")
  Front: "front",

  @doc("Specifies that the n-gram should be generated from the back of the input.")
  Back: "back",
}

@doc("Generates n-grams of the given size(s) starting from the front or the back of an input token. This token filter is implemented using Apache Lucene.")
model EdgeNGramTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.EdgeNGramTokenFilter";

  @doc("The minimum n-gram length. Default is 1. Must be less than the value of maxGram.")
  minGram?: int32 = 1;

  @doc("The maximum n-gram length. Default is 2.")
  maxGram?: int32 = 2;

  @doc("Specifies which side of the input the n-gram should be generated from. Default is \"front\".")
  side?: EdgeNGramTokenFilterSide; //= EdgeNGramTokenFilterSide.Front
}

@doc("Generates n-grams of the given size(s) starting from the front or the back of an input token. This token filter is implemented using Apache Lucene.")
model EdgeNGramTokenFilterV2 extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.EdgeNGramTokenFilterV2";

  @doc("The minimum n-gram length. Default is 1. Must be less than the value of maxGram.")
  minGram?: int32 = 1;

  @doc("The maximum n-gram length. Default is 2.")
  maxGram?: int32 = 2;

  @doc("Specifies which side of the input the n-gram should be generated from. Default is \"front\".")
  side?: EdgeNGramTokenFilterSide; //= EdgeNGramTokenFilterSide.Front
}

@doc("Removes elisions. For example, \"l'avion\" (the plane) will be converted to \"avion\" (plane). This token filter is implemented using Apache Lucene.")
model ElisionTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.ElisionTokenFilter";

  @doc("The set of articles to remove.")
  articles?: string[];
}

@doc("A token filter that only keeps tokens with text contained in a specified list of words. This token filter is implemented using Apache Lucene.")
model KeepTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.KeepTokenFilter";

  @doc("The list of words to keep.")
  keepWords: string[];

  @doc("A value indicating whether to lower case all words first. Default is false.")
  @projectedName("json", "keepWordsCase")
  lowerCaseKeepWords?: boolean = false;
}

@doc("Marks terms as keywords. This token filter is implemented using Apache Lucene.")
model KeywordMarkerTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.KeywordMarkerTokenFilter";

  @doc("A list of words to mark as keywords.")
  keepWords: string[];

  @doc("A value indicating whether to ignore case. If true, all words are converted to lower case first. Default is false.")
  ignoreCase?: boolean = false;
}

@doc("Removes words that are too long or too short. This token filter is implemented using Apache Lucene.")
model LengthTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.LengthTokenFilter";

  @doc("The minimum length in characters. Default is 0. Maximum is 300. Must be less than the value of max.")
  @maxValue(300)
  @projectedName("json", "min")
  minLength?: int32 = 0;

  @doc("The maximum  length in characters. Default is 0. Maximum is 300. Must be less than the value of max.")
  @maxValue(300)
  @projectedName("json", "max")
  maxLength?: int32 = 300;
}

@doc("Limits the number of tokens while indexing. This token filter is implemented using Apache Lucene.")
model LimitTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.LimitTokenFilter";

  @doc("The maximum number of tokens to produce. Default is 1.")
  @maxValue(300)
  maxTokenCount?: int32 = 1;

  @doc("A value indicating whether all tokens from the input must be consumed even if maxTokenCount is reached. Default is false.")
  consumeAllTokens?: boolean = false;
}

@doc("Generates n-grams of the given size(s). This token filter is implemented using Apache Lucene.")
model NGramTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.NGramTokenFilter";

  @doc("The minimum n-gram length. Default is 1. Must be less than the value of maxGram.")
  minGram?: int32 = 1;

  @doc("The maximum n-gram length. Default is 2.")
  maxGram?: int32 = 2;
}

@doc("Generates n-grams of the given size(s). This token filter is implemented using Apache Lucene.")
model NGramTokenFilterV2 extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.NGramTokenFilterV2";

  @doc("The minimum n-gram length. Default is 1. Must be less than the value of maxGram.")
  minGram?: int32 = 1;

  @doc("The maximum n-gram length. Default is 2.")
  maxGram?: int32 = 2;
}

@doc("Generates n-grams of the given size(s). This token filter is implemented using Apache Lucene.")
model PatternCaptureTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.PatternCaptureTokenFilter";

  @doc("A list of patterns to match against each token.")
  patterns: string[];

  @doc("A value indicating whether to return the original token even if one of the patterns matches. Default is true.")
  preserveOriginal?: boolean = true;
}

@doc("A character filter that replaces characters in the input string. It uses a regular expression to identify character sequences to preserve and a replacement pattern to identify characters to replace. For example, given the input text \"aa bb aa bb\", pattern \"(aa)\\s+(bb)\", and replacement \"$1#$2\", the result would be \"aa#bb aa#bb\". This token filter is implemented using Apache Lucene.")
model PatternReplaceTokenFilter extends TokenFilter {
  `@odata.type`: "#Microsoft.Azure.Search.PatternReplaceTokenFilter";

  @doc("A regular expression pattern.")
  pattern: string;

  @doc("The replacement text.")
  replacement: string;
}

@doc("Base type for character filters.")
@discriminator("@odata.type")
model CharFilter {
  @doc("The name of the char filter. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters.")
  name: string;
}

@doc("A character filter that applies mappings defined with the mappings option. Matching is greedy (longest pattern matching at a given point wins). Replacement is allowed to be the empty string. This character filter is implemented using Apache Lucene.")
model MappingCharFilter extends CharFilter {
  `@odata.type`: "#Microsoft.Azure.Search.MappingCharFilter";

  @doc("A list of mappings of the following format: \"a=>b\" (all occurrences of the character \"a\" will be replaced with character \"b\").")
  mappings: string[];
}

@doc("A character filter that replaces characters in the input string. It uses a regular expression to identify character sequences to preserve and a replacement pattern to identify characters to replace. For example, given the input text \"aa bb aa bb\", pattern \"(aa)\\s+(bb)\", and replacement \"$1#$2\", the result would be \"aa#bb aa#bb\". This character filter is implemented using Apache Lucene.")
model PatternReplaceCharFilter extends CharFilter {
  `@odata.type`: "#Microsoft.Azure.Search.PatternReplaceCharFilter";

  @doc("A regular expression pattern.")
  pattern: string;

  @doc("The replacement text.")
  replacement: string;
}

@doc("Base type for similarity algorithms. Similarity algorithms are used to calculate scores that tie queries to documents. The higher the score, the more relevant the document is to that specific query. Those scores are used to rank the search results.")
@discriminator("@odata.type")
model Similarity {}

@doc("Legacy similarity algorithm which uses the Lucene TFIDFSimilarity implementation of TF-IDF. This variation of TF-IDF introduces static document length normalization as well as coordinating factors that penalize documents that only partially match the searched queries.")
model ClassicSimilarity extends Similarity {
  `@odata.type`: "#Microsoft.Azure.Search.ClassicSimilarity";
}

@doc("Ranking function based on the Okapi BM25 similarity algorithm. BM25 is a TF-IDF-like algorithm that includes length normalization (controlled by the 'b' parameter) as well as term frequency saturation (controlled by the 'k1' parameter).")
model BM25Similarity extends Similarity {
  `@odata.type`: "#Microsoft.Azure.Search.BM25Similarity";

  @doc("This property controls the scaling function between the term frequency of each matching terms and the final relevance score of a document-query pair. By default, a value of 1.2 is used. A value of 0.0 means the score does not scale with an increase in term frequency.")
  k1?: float64;

  @doc("This property controls how the length of a document affects the relevance score. By default, a value of 0.75 is used. A value of 0.0 means no length normalization is applied, while a value of 1.0 means the score is fully normalized by the length of the document.")
  b?: float64;
}

@doc("Defines parameters for a search index that influence semantic capabilities.")
model SemanticSettings {
  @doc("The semantic configurations for the index.")
  configurations: SemanticConfiguration[];
}

@doc("Defines a specific configuration to be used in the context of semantic capabilities.")
model SemanticConfiguration {
  @doc("The name of the semantic configuration.")
  name: string;

  @doc("Describes the title, content, and keyword fields to be used for semantic ranking, captions, highlights, and answers. At least one of the three sub properties (titleField, prioritizedKeywordsFields and prioritizedContentFields) need to be set.")
  prioritizedFields: PrioritizedFields;
}

@doc("Describes the title, content, and keywords fields to be used for semantic ranking, captions, highlights, and answers.")
model PrioritizedFields {
  @doc("Defines the title field to be used for semantic ranking, captions, highlights, and answers. If you don't have a title field in your index, leave this blank.")
  titleField?: SemanticField[];

  @doc("Defines the content fields to be used for semantic ranking, captions, highlights, and answers. For the best result, the selected fields should contain text in natural language form. The order of the fields in the array represents their priority. Fields with lower priority may get truncated if the content is long.")
  prioritizedContentFields?: SemanticField[];

  @doc("Defines the keyword fields to be used for semantic ranking, captions, highlights, and answers. For the best result, the selected fields should contain a list of keywords. The order of the fields in the array represents their priority. Fields with lower priority may get truncated if the content is long.")
  prioritizedKeywordsFields?: SemanticField[];
}

@doc("A field that is used as part of the semantic configuration.")
model SemanticField {
  @doc("Field name.")
  fieldName: string;
}

@doc("Base type for normalizers.")
@discriminator("@odata.type")
model LexicalNormalizer {
  @doc("The name of the normalizer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. It cannot end in '.microsoft' nor '.lucene', nor be named 'asciifolding', 'standard', 'lowercase', 'uppercase', or 'elision'.")
  name: string;
}

@doc("Allows you to configure normalization for filterable, sortable, and facetable fields, which by default operate with strict matching. This is a user-defined configuration consisting of at least one or more filters, which modify the token that is stored.")
model CustomNormalizer extends LexicalNormalizer {
  `@odata.type`: "#Microsoft.Azure.Search.CustomNormalizer";

  @doc("A list of token filters used to filter out or modify the input token. For example, you can specify a lowercase filter that converts all characters to lowercase. The filters are run in the order in which they are listed.")
  tokenFilters?: TokenFilterName[];

  @doc("A list of character filters used to prepare input text before it is processed. For instance, they can replace certain characters or symbols. The filters are run in the order in which they are listed.")
  charFilters?: CharFilterName;
}

@doc("Defines the names of all text normalizers supported by Azure Cognitive Search.")
enum LexicalNormalizerName {
  @doc("Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the \"Basic Latin\" Unicode block) into their ASCII equivalents, if such equivalents exist. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ASCIIFoldingFilter.html")
  Asciifolding: "asciifolding",

  @doc("Removes elisions. For example, \"l'avion\" (the plane) will be converted to \"avion\" (plane). See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/util/ElisionFilter.html")
  Elision: "elision",

  @doc("Normalizes token text to lowercase. See https://lucene.apache.org/core/6_6_1/analyzers-common/org/apache/lucene/analysis/core/LowerCaseFilter.html")
  Lowercase: "lowercase",

  @doc("Standard normalizer, which consists of lowercase and asciifolding. See http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/reverse/ReverseStringFilter.html")
  Standard: "standard",

  @doc("Normalizes token text to uppercase. See https://lucene.apache.org/core/6_6_1/analyzers-common/org/apache/lucene/analysis/core/UpperCaseFilter.html")
  Uppercase: "uppercase",
}

@doc("Statistics for a given index. Statistics are collected periodically and are not guaranteed to always be up-to-date.")
model GetIndexStatisticsResult {
  @doc("The number of documents in the index.")
  documentCount: int64;

  @doc("The amount of storage in bytes consumed by the index.")
  storageSize: int64;
}

@doc("Specifies some text and analysis components used to break that text into tokens.")
model AnalyzeRequest {
  @doc("The text to break into tokens.")
  text: string;

  @doc("The name of the analyzer to use to break the given text.")
  analyzer?: LexicalAnalyzerName;

  @doc("The name of the tokenizer to use to break the given text.")
  tokenizer?: LexicalTokenizerName;

  @doc("The name of the normalizer to use to normalize the given text.")
  normalizer?: LexicalNormalizerName;

  @doc("An optional list of token filters to use when breaking the given text.")
  tokenFilters?: TokenFilterName[];

  @doc("An optional list of character filters to use when breaking the given text.")
  charFilters?: CharFilterName[];
}

@doc("The result of testing an analyzer on text.")
model AnalyzeResult {
  @doc("The list of tokens returned by the analyzer specified in the request.")
  tokens: AnalyzedTokenInfo[];
}

@doc("Information about a token returned by an analyzer.")
model AnalyzedTokenInfo {
  @doc("The token returned by the analyzer.")
  token: string;

  @doc("The index of the first character of the token in the input text.")
  startOffset: int32;

  @doc("The index of the last character of the token in the input text.")
  endOffset: int32;

  @doc("The position of the token in the input text relative to other tokens. The first token in the input text has position 0, the next has position 1, and so on. Depending on the analyzer used, some tokens might have the same position, for example if they are synonyms of each other.")
  position: int32;
}
