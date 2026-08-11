> Source: https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a

Total compiled projects: 450
Total validator rules: 210
Total with some form of coverage: 138
Total needing investigation/migration: 72

======================================================================================================================================================
COVERAGE SUMMARY
======================================================================================================================================================
Category                                                     Rules     
------------------------------------------------------------------------------------------------------------------------------------------------------
100% coverage (lint fired + official/no-action)              37        
80-99% coverage                                              11        
Below 80% coverage                                           25        
Blocked/Infallible (TypeSpec prevents structurally)          36        
Validator never fired (mapped, effectively covered)          29        
Needs migration (fired, no mapping)                          37        
Needs investigation (never fired, no mapping)                35        
------------------------------------------------------------------------------------------------------------------------------------------------------
TOTAL                                                        210       

======================================================================================================================================================
100% COVERAGE (37 rules) - every validator firing is covered by lint or official ruleset
======================================================================================================================================================
Validator Rule                                CovKind      Fired   Lint    Official   Pct     TSP Rule(s)
------------------------------------------------------------------------------------------------------------------------------------------------------
ApiVersionParameterRequired                   lint         445     0       445        100.0   @azure-tools/typespec-azure-core/operation-missing-api-version, @azure-tools/typespec-azure-resource-manager/arm-resource-operation
ParameterDescription                          none         445     0       445        100.0   @azure-tools/typespec-azure-core/documentation-required
VersionPolicy                                 lint         445     0       445        100.0   @azure-tools/typespec-azure-core/operation-missing-api-version, tsp-lintdiff-local-linter/version-policy
AvoidAdditionalProperties                     lint         260     0       260        100.0   @azure-tools/typespec-azure-resource-manager/arm-no-record
SchemaNamesConvention                         none         239     0       239        100.0   @azure-tools/typespec-azure-core/casing-style
ResourceNameRestriction                       lint         124     0       124        100.0   @azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern
DeleteResponseCodes                           lint         103     0       103        100.0   @azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes, @azure-tools/typespec-azure-resource-manager/no-response-body
PutResponseCodes                              lint         102     0       102        100.0   @azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes
SchemaDescriptionOrTitle                      none         100     0       100        100.0   @azure-tools/typespec-azure-core/documentation-required
XMSSecretInResponse                           lint         99      0       99         100.0   @azure-tools/typespec-azure-resource-manager/secret-prop
PropertyDescription                           none         90      0       90         100.0   @azure-tools/typespec-azure-core/documentation-required
ProvisioningStateMustBeReadOnly               lint         89      0       89         100.0   @azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state
PropertiesTypeObjectNoDefinition              lint         77      0       77         100.0   @azure-tools/typespec-azure-resource-manager/no-empty-model
Nullable                                      none         64      0       64         100.0   @azure-tools/typespec-azure-core/no-nullable
LroErrorContent                               lint         55      55      0          100.0   tsp-lintdiff-local-linter/lro-error-content (55x)
DefinitionsPropertiesNamesCamelCase           none         50      0       50         100.0   @azure-tools/typespec-azure-core/casing-style
PutInOperationName                            lint         50      50      0          100.0   tsp-lintdiff-local-linter/put-in-operation-name (50x)
LroLocationHeader                             lint         39      0       39         100.0   @azure-tools/typespec-azure-resource-manager/lro-location-header
PutRequestResponseSchemeArm                   lint         36      34      2          100.0   tsp-lintdiff-local-linter/put-request-response-scheme-arm (34x)
SummaryAndDescriptionMustNotBeSame            lint         34      34      0          100.0   tsp-lintdiff-local-linter/summary-and-description-must-not-be-same (34x)
RepeatedPathInfo                              none         23      23      0          100.0   tsp-lintdiff-local-linter/repeated-path-info (23x)
EvenSegmentedPathForPutOperation              lint         20      20      0          100.0   tsp-lintdiff-local-linter/even-segmented-path-for-put-operation (20x)
NoErrorCodeResponses                          lint         20      20      0          100.0   tsp-lintdiff-local-linter/no-error-code-responses (20x)
AdditionalPropertiesAndProperties             none         19      0       19         100.0   @azure-tools/typespec-azure-core/bad-record-type
ProvisioningStateValidation                   lint         16      0       16         100.0   @azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state
GetResponseCodes                              lint         14      14      0          100.0   tsp-lintdiff-local-linter/get-response-codes (14x)
LroExtension                                  lint         14      14      0          100.0   tsp-lintdiff-local-linter/lro-extension (14x)
PatchInOperationName                          lint         14      14      0          100.0   tsp-lintdiff-local-linter/patch-in-operation-name (14x)
PutGetPatchResponseSchema                     partial      13      0       13         100.0   @azure-tools/typespec-azure-resource-manager/arm-resource-operation-response
DeleteInOperationName                         lint         9       9       0          100.0   tsp-lintdiff-local-linter/delete-in-operation-name (9x)
TrackedExtensionResourcesAreNotAllowed        none         9       0       9          100.0   @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property
ResponseSchemaSpecifiedForSuccessStatusCode   none         6       0       6          100.0   @azure-tools/typespec-azure-resource-manager/no-response-body
SubscriptionsAndResourceGroupCasing           lint         6       6       0          100.0   tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing (6x)
PathCharacters                                none         4       4       0          100.0   tsp-lintdiff-local-linter/path-characters (4x)
XMSLongRunningOperationProperty               lint         3       3       0          100.0   tsp-lintdiff-local-linter/xms-long-running-operation-property (3x)
OperationSummaryOrDescription                 none         2       0       2          100.0   @azure-tools/typespec-azure-core/documentation-required
SystemDataDefinitionsCommonTypes              lint         2       0       2          100.0   @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property

======================================================================================================================================================
80-99% COVERAGE (11 rules)
======================================================================================================================================================
Validator Rule                                CovKind      Fired   Lint    Official   Pct     TSP Rule(s)
------------------------------------------------------------------------------------------------------------------------------------------------------
EnumInsteadOfBoolean                          none         285     284     0          99.6    tsp-lintdiff-local-linter/enum-instead-of-boolean (284x)
ValidQueryParametersForPointOperations        none         62      61      0          98.4    tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations (61x)
LatestVersionOfCommonTypesMustBeUsed          lint         394     386     0          98.0    tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used (386x)
PatchBodyParametersSchema                     partial      87      85      0          97.7    tsp-lintdiff-local-linter/patch-body-parameters-schema (85x)
ParametersInPointGet                          lint         38      37      0          97.4    tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations (37x)
GetCollectionOnlyHasValueAndNextLink          none         60      58      0          96.7    tsp-lintdiff-local-linter/get-collection-only-has-value-and-next-link (58x)
ParameterNamesConvention                      none         106     102     0          96.2    tsp-lintdiff-local-linter/parameter-names-convention (102x)
GetInOperationName                            lint         26      24      0          92.3    tsp-lintdiff-local-linter/get-in-operation-name (24x)
ListInOperationName                           lint         52      46      0          88.5    tsp-lintdiff-local-linter/list-in-operation-name (46x)
XmsExamplesRequired                           lint         6       5       0          83.3    tsp-lintdiff-local-linter/xms-examples-required (5x)
OperationIdNounVerb                           none         32      26      0          81.2    tsp-lintdiff-local-linter/operation-id-noun-verb (26x)

======================================================================================================================================================
BELOW 80% COVERAGE (25 rules)
======================================================================================================================================================
Validator Rule                                CovKind      Fired   Lint    Official   Pct     TSP Rule(s)
------------------------------------------------------------------------------------------------------------------------------------------------------
PathParameterNames                            none         38      30      0          78.9    tsp-lintdiff-local-linter/path-parameter-names (30x)
ParametersInPost                              none         33      25      0          75.8    tsp-lintdiff-local-linter/parameters-in-post (25x)
NonApplicationJsonType                        none         4       3       0          75.0    tsp-lintdiff-local-linter/non-application-json-type (3x)
PathParameterSchema                           none         390     292     0          74.9    tsp-lintdiff-local-linter/path-parameter-schema (292x)
QueryParametersInCollectionGet                none         119     88      0          73.9    tsp-lintdiff-local-linter/query-parameters-in-collection-get (88x)
TenantLevelAPIsNotAllowed                     none         24      15      0          62.5    tsp-lintdiff-local-linter/tenant-level-apis-not-allowed (15x)
GuidUsage                                     lint         44      23      0          52.3    tsp-lintdiff-local-linter/guid-usage (23x)
ParametersSchemaAsTypeObject                  none         9       4       0          44.4    tsp-lintdiff-local-linter/parameters-schema-as-type-object (4x)
XmsPageableForListCalls                       lint         75      24      0          32.0    tsp-lintdiff-local-linter/xms-pageable-for-list-calls (24x)
UnSupportedPatchProperties                    lint         42      7       0          16.7    tsp-lintdiff-local-linter/unsupported-patch-properties (7x)
ConsistentResponseSchemaForPut                lint         8       1       0          12.5    tsp-lintdiff-local-linter/consistent-response-schema-for-put (1x)
ConsistentPatchProperties                     lint         303     25      0          8.3     tsp-lintdiff-local-linter/consistent-patch-properties (25x)
PatchPropertiesCorrespondToPutProperties      lint         308     20      0          6.5     tsp-lintdiff-local-linter/consistent-patch-properties (20x)
TagsAreNotAllowedForProxyResources            lint         313     16      0          5.1     tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources (16x)
RequestBodyOptional                           none         63      2       0          3.2     tsp-lintdiff-local-linter/request-body-optional (2x)
PutRequestResponseScheme                      lint         36      1       0          2.8     tsp-lintdiff-local-linter/put-request-response-scheme (1x)
PaginationResponse                            none         254     3       0          1.2     tsp-lintdiff-local-linter/pagination-response (3x)
XmsResourceInPutResponse                      lint         391     2       0          0.5     tsp-lintdiff-local-linter/xms-resource-in-put-response (2x)
AvoidAnonymousParameter                       lint         4       0       0          0.0     tsp-lintdiff-local-linter/avoid-anonymous-parameter
AvoidAnonymousTypes                           lint         7       0       0          0.0     tsp-lintdiff-local-linter/avoid-anonymous-types
CollectionObjectPropertiesNaming              none         140     0       0          0.0     tsp-lintdiff-local-linter/collection-object-properties-naming
OperationIdNounConflictingModelNames          lint         53      0       0          0.0     tsp-lintdiff-local-linter/operation-id-noun-conflicting-model-names
Post201Response                               none         3       0       0          0.0     tsp-lintdiff-local-linter/post-201-response
PostResponseCodes                             template     109     0       0          0.0     @azure-tools/typespec-azure-resource-manager/arm-post-operation-response-c\
PutPath                                       lint         48      0       0          0.0     tsp-lintdiff-local-linter/put-path

======================================================================================================================================================
BLOCKED/INFALLIBLE (36 rules) - TypeSpec prevents these structurally
======================================================================================================================================================
Validator Rule                                CovKind      Fired    Mapped TSP Rule(s)
------------------------------------------------------------------------------------------------------------------------------------------------------
ApiHost                                       infallible   0        
ArrayMustHaveType                             infallible   0        
ArraySchemaMustHaveItems                      infallible   0        
AvoidEmptyResponseSchema                      infallible   0        
AvoidNestedProperties                         blocked      10       
ControlCharactersAreNotAllowed                infallible   0        
EnumMustHaveType                              infallible   0        
EnumMustNotHaveEmptyValue                     blocked      0        
EnumMustRespectType                           infallible   0        
EnumUniqueValue                               blocked      0        
HostParametersValidation                      infallible   0        
HttpsSupportedScheme                          infallible   0        
IntegerTypeMustHaveFormat                     infallible   0        
InvalidVerbUsed                               infallible   0        
LroPostMustNotUseOriginalUriAsFinalState      blocked      1        
LroStatusCodesReturnTypeSchema                blocked      3        
MissingTypeObject                             infallible   0        
NamePropertyDefinitionInParameter             infallible   445      
NextLinkPropertyMustExist                     blocked      139      
NoDuplicatePathsForScopeParameter             blocked      3        
NonEmptyClientName                            blocked      0        
OperationIdRequired                           infallible   0        
OperationIdSingleUnderscore                   blocked      0        
OperationsApiTenantLevelOnly                  blocked      2        
ParameterNotDefinedInGlobalParameters         infallible   8        
ParameterOrder                                infallible   378      
ParametersOrder                               infallible   0        
PatchContentType                              infallible   348      
PathForResourceAction                         blocked      27       
ProvisioningStateSpecifiedForLROPatch         blocked      14       
ProvisioningStateSpecifiedForLROPut           blocked      61       
RequestSchemaForTrackedResourcesMustHaveTags  blocked      25       
SubscriptionIdParameterInOperations           infallible   6        
UniqueClientParameterName                     infallible   0        
UniqueModelName                               infallible   0        
ValidResponseCodeRequired                     infallible   0        

======================================================================================================================================================
VALIDATOR NEVER FIRED, MAPPED (29 rules) - effectively covered
======================================================================================================================================================
Validator Rule                                CovKind      Mapped TSP Rule(s)
------------------------------------------------------------------------------------------------------------------------------------------------------
APIVersionPattern                             lint         @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format
AllProxyResourcesShouldHaveDelete             none         @azure-tools/typespec-azure-resource-manager/no-resource-delete-operation
AllResourcesMustHaveGetOperation              lint         tsp-lintdiff-local-linter/all-resources-must-have-get-operation
AllTrackedResourcesMustHaveDelete             lint         @azure-tools/typespec-azure-resource-manager/no-resource-delete-operation
ArmResourcePropertiesBag                      none         @azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property
BodyTopLevelProperties                        lint         @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property
DescriptionMustNotBeNodeName                  lint         tsp-lintdiff-local-linter/description-must-not-be-node-name
DescriptiveDescriptionRequired                none         tsp-lintdiff-local-linter/descriptive-description-required
ExtensionResourcePathPattern                  lint         tsp-lintdiff-local-linter/extension-resource-path-pattern
ImplementPrivateEndpointAPIs                  lint         tsp-lintdiff-local-linter/implement-private-endpoint-apis
LongRunningOperationsOptionsValidator         lint         tsp-lintdiff-local-linter/long-running-operations-options-validator
MissingXmsErrorResponse                       none         tsp-lintdiff-local-linter/missing-xms-error-response
MutabilityWithReadOnly                        partial      tsp-lintdiff-local-linter/mutability-with-read-only
NestedResourcesMustHaveListOperation          lint         tsp-lintdiff-local-linter/nested-resources-must-have-list-operation
OperationsAPIImplementation                   lint         @azure-tools/typespec-azure-resource-manager/missing-operations-endpoint
PageableRequires200Response                   none         tsp-lintdiff-local-linter/pageable-requires-200-response
ParameterDescriptionRequired                  none         @azure-tools/typespec-azure-core/documentation-required
PathResourceProviderNamePascalCase            template     tsp-lintdiff-local-linter/path-resource-provider-name-pascal-case
PathResourceTypeNameCamelCase                 lint         @azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars
PostOperationIdContainsUrlVerb                lint         tsp-lintdiff-local-linter/post-operation-id-contains-url-verb
PreviewVersionOverOneYear                     lint         tsp-lintdiff-local-linter/preview-version-over-one-year
RequestBodyNotAllowed                         lint         tsp-lintdiff-local-linter/request-body-not-allowed
SecurityDefinitionDescription                 lint         tsp-lintdiff-local-linter/security-definition-description
TopLevelResourcesListByResourceGroup          none         tsp-lintdiff-local-linter/top-level-resources-list-by-resource-group
TrackedResourceBeyondsThirdLevel              lint         @azure-tools/typespec-azure-resource-manager/beyond-nesting-levels
TrackedResourcePatchOperation                 lint         tsp-lintdiff-local-linter/tracked-resource-patch-operation
TrackedResourcesMustHavePut                   none         tsp-lintdiff-local-linter/tracked-resources-must-have-put
XmsIdentifierValidation                       lint         @azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers
XmsPageableMustHaveCorrespondingResponse      none         tsp-lintdiff-local-linter/xms-pageable-must-have-corresponding-response

======================================================================================================================================================
NEEDS MIGRATION (37 rules) - validator fired but no TSP lint mapping exists
======================================================================================================================================================
Validator Rule                                CovKind      Fired   
------------------------------------------------------------------------------------------------------------------------------------------------------
invalid-ref                                   unknown      445     
ErrorResponse                                 none         441     
ParameterNamesUnique                          none         399     
LroHeaders                                    none         337     
OperationId                                   template     263     
SuccessResponseBody                           none         198     
OperationsApiResponseSchema                   template     178     
SchemaTypeAndFormat                           none         99      
PropertyType                                  none         89      
LocationMustHaveXmsMutability                 template     85      
OperationsApiSchemaUsesCommonTypes            none         84      
ParameterNotUsingCommonTypes                  template     69      
PatchResponseCodes                            template     60      
MissingSegmentsInNestedResourceListOperation  template     47      
LroPatch202                                   template     23      
PatchIdentityProperty                         template     22      
DeleteResponseBodyEmpty                       template     21      
PatchSkuProperty                              template     20      
PathForNestedResource                         template     20      
PathForTrackedResourceTypes                   template     20      
RequestBodyMustExistForPutPatch               template     20      
Delete204Response                             template     19      
ConsistentResponseBody                        none         11      
AvoidMsdnReferences                           none         9       
PathContainsResourceType                      template     8       
AdditionalPropertiesObject                    none         7       
DefaultResponse                               template     7       
ReservedResourceNamesModelAsEnum              none         6       
ValidFormats                                  none         6       
MsPaths                                       none         5       
InvalidSkuModel                               none         4       
ResourceHasXMsResourceEnabled                 template     3       
GetOperationMustNotBeLongRunning              template     2       
ParameterDefaultNotAllowed                    none         2       
PathContainsResourceGroup                     template     2       
ApiVersionEnum                                none         1       
XmsPathsMustOverloadPaths                     none         1       

======================================================================================================================================================
NEEDS INVESTIGATION (35 rules) - validator never fired, no mapping
======================================================================================================================================================
Validator Rule                                CovKind      Fired   
------------------------------------------------------------------------------------------------------------------------------------------------------
AzureResourceTagsSchema                       template     0       
DefaultErrorResponseSchema                    template     0       
DefaultInEnum                                 none         0       
DeleteMustNotHaveRequestBody                  template     0       
DeleteOperationResponses                      template     0       
DeprecatedXmsCodeGenerationSetting            none         0       
Formdata                                      none         0       
GetCollectionResponseSchema                   none         0       
GetMustNotHaveRequestBody                     template     0       
HeaderDisallowed                              none         0       
LicenseHeaderMustNotBeSpecified               none         0       
LongRunningResponseStatusCodeDataPlane        none         0       
LroWithOriginalUriAsFinalState                template     0       
MissingDefaultResponse                        template     0       
PageableOperation                             none         0       
PathContainsSubscriptionId                    template     0       
PathResourceProviderMatchNamespace            template     0       
PrivateEndpointResourceSchemaValidation       none         0       
RequiredDefaultResponse                       template     0       
RequiredPropertiesMissingInResourceModel      template     0       
RequiredReadOnlySystemData                    template     0       
Rpaas_ResourceProvisioningState               none         0       
SecurityDefinitionsStructure                  template     0       
SystemDataInPropertiesBag                     none         0       
TopLevelResourcesListBySubscription           none         0       
UniqueXmsEnumName                             none         0       
UniqueXmsExample                              none         0       
VersionConvention                             none         0       
XmsClientName                                 template     0       
XmsClientNameParameter                        template     0       
XmsClientNameProperty                         template     0       
XmsEnumValidation                             none         0       
XmsPageableListByRGAndSubscriptions           none         0       
XmsParameterLocation                          none         0       
docLinkLocale                                 none         0       
