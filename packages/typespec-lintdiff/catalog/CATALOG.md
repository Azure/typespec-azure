# Azure OpenAPI Validator → TypeSpec Lint Coverage Catalog

Generated: 2026-05-04

Total rules: 209

| Metric | Count |
|--------|-------|
| ARM-only | 131 |
| DataPlane-only | 37 |
| Both (common) | 41 |
| Known TSP equivalent | 16 |
| **Infallible** (no action needed) | 29 |
| **Template-enforced** (low priority) | 46 |
| **Prerequisite-blocked** (investigate existing TypeSpec diagnostics first) | 4 |
| **Unconstrained** (high priority) | 130 |

## Classification Key

- **Infallible**: TypeSpec cannot generate swagger that violates this rule.
- **Template-enforced**: Standard ARM/Core templates prevent violation; only custom operations can violate.
- **Prerequisite-blocked**: The violating shape depends on constructs that TypeSpec already rejects, or only becomes authorable after suppressing an existing diagnostic.
- **Unconstrained**: Can be violated even when using standard templates. Highest priority for TSP linter coverage.

## Catalog

### ARM Only (131 rules)

| Rule | Severity | RPC Code | TSP Equivalent | Tier | Doc |
|------|----------|----------|----------------|------|-----|
| AllProxyResourcesShouldHaveDelete | warning | RPC-Delete-V1-05 | — | Unconstrained | ✓ |
| AllResourcesMustHaveGetOperation | warning | RPC-Get-V1-04 | — | Unconstrained | ✓ |
| AllTrackedResourcesMustHaveDelete | error | RPC-Delete-V1-03 | — | Unconstrained | ✓ |
| ApiHost | error | — | — | Infallible | ✓ |
| ApiVersionParameterRequired | error | RPC-Uri-V1-08 | — | Unconstrained | ✓ |
| APIVersionPattern | error | — | — | Unconstrained | — |
| ArmResourcePropertiesBag | error | RPC-Get-V1-07 | — | Unconstrained | ✓ |
| ArrayMustHaveType | error | — | — | Infallible | ✓ |
| AvoidAdditionalProperties | error | RPC-Policy-V1-05, RPC-Put-V1-23 | `@azure-tools/typespec-azure-resource-manager/no-record` | Unconstrained | ✓ |
| AvoidEmptyResponseSchema | error | — | — | Infallible | ✓ |
| AzureResourceTagsSchema | error | — | — | Template-enforced | ✓ |
| BodyTopLevelProperties | error | RPC-Put-V1-06 | — | Unconstrained | ✓ |
| CollectionObjectPropertiesNaming | error | — | — | Unconstrained | ✓ |
| ConsistentPatchProperties | error | RPC-Patch-V1-01 | — | Unconstrained | ✓ |
| ConsistentResponseSchemaForPut | error | RPC-Put-V1-29 | — | Unconstrained | ✓ |
| ControlCharactersAreNotAllowed | error | — | — | Infallible | — |
| DefaultErrorResponseSchema | error | — | — | Infallible | ✓ |
| DefinitionsPropertiesNamesCamelCase | error | — | — | Unconstrained | ✓ |
| DeleteMustNotHaveRequestBody | error | RPC-Delete-V1-02 | — | Template-enforced | ✓ |
| DeleteOperationResponses | error | RPC-Delete-V1-01 | — | Template-enforced | ✓ |
| DeleteResponseBodyEmpty | error | RPC-Delete-V1-04 | — | Template-enforced | ✓ |
| DeleteResponseCodes | error | RPC-Delete-V1-01, RPC-Async-V1-09 | `@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes` | Template-enforced | ✓ |
| DeprecatedXmsCodeGenerationSetting | warning | — | — | Unconstrained | ✓ |
| DescriptionMustNotBeNodeName | error | — | — | Unconstrained | ✓ |
| EnumMustHaveType | error | — | — | Infallible | ✓ |
| EnumMustNotHaveEmptyValue | error | — | — | Infallible | ✓ |
| EnumMustRespectType | error | — | — | Infallible | ✓ |
| EnumUniqueValue | error | — | — | Infallible | ✓ |
| EvenSegmentedPathForPutOperation | error | RPC-Put-V1-02 | — | Unconstrained | ✓ |
| GetCollectionOnlyHasValueAndNextLink | error | RPC-Get-V1-09, RPC-Arg-V1-01, RPC-Get-V1-06 | — | Unconstrained | ✓ |
| GetCollectionResponseSchema | error | RPC-Get-V1-10 | — | Unconstrained | ✓ |
| GetMustNotHaveRequestBody | error | RPC-Get-V1-02 | — | Template-enforced | ✓ |
| GetOperationMustNotBeLongRunning | error | RPC-Get-V1-14 | — | Template-enforced | ✓ |
| GetResponseCodes | error | RPC-Get-V1-01 | — | Template-enforced | ✓ |
| GuidUsage | error | — | — | Unconstrained | ✓ |
| HttpsSupportedScheme | warn | — | — | Infallible | ✓ |
| ImplementPrivateEndpointAPIs | warning | — | — | Unconstrained | — |
| IntegerTypeMustHaveFormat | error | — | — | Infallible | ✓ |
| InvalidSkuModel | warn | — | — | Unconstrained | ✓ |
| LatestVersionOfCommonTypesMustBeUsed | warn | — | — | Unconstrained | ✓ |
| LicenseHeaderMustNotBeSpecified | warning | — | — | Unconstrained | ✓ |
| LocationMustHaveXmsMutability | warn | RPC-Put-V1-14 | — | Template-enforced | ✓ |
| LroErrorContent | error | RPC-Common-V1-05 | — | Unconstrained | ✓ |
| LroLocationHeader | error | RPC-Async-V1-07 | `@azure-tools/typespec-azure-resource-manager/arm-location-header` | Template-enforced | ✓ |
| LroPatch202 | error | RPC-Patch-V1-06, RPC-Async-V1-08 | — | Template-enforced | ✓ |
| LroPostMustNotUseOriginalUriAsFinalState | error | — | — | Template-enforced | — |
| LroWithOriginalUriAsFinalState | error | — | — | Template-enforced | — |
| MissingDefaultResponse | error | — | — | Template-enforced | ✓ |
| MissingSegmentsInNestedResourceListOperation | warn | RPC-Get-V1-11 | — | Template-enforced | ✓ |
| MissingTypeObject | error | — | — | Infallible | ✓ |
| MissingXmsErrorResponse | error | — | — | Unconstrained | ✓ |
| NestedResourcesMustHaveListOperation | error | — | — | Unconstrained | ✓ |
| NoDuplicatePathsForScopeParameter | error | RPC-Uri-V1-10 | — | Unconstrained | ✓ |
| NoErrorCodeResponses | error | — | — | Unconstrained | ✓ |
| NonApplicationJsonType | warn | — | — | Unconstrained | ✓ |
| OperationIdRequired | error | — | — | Infallible | ✓ |
| OperationsAPIImplementation | error | — | — | Unconstrained | — |
| OperationsApiResponseSchema | error | — | — | Unconstrained | ✓ |
| OperationsApiSchemaUsesCommonTypes | error | RPC-Operations-V1-01 | — | Unconstrained | ✓ |
| OperationsApiTenantLevelOnly | error | RPC-Operations-V1-02 | — | Unconstrained | ✓ |
| PageableOperation | warning | — | — | Unconstrained | ✓ |
| ParameterNotDefinedInGlobalParameters | warn | — | — | Infallible | ✓ |
| ParameterNotUsingCommonTypes | warn | — | — | Unconstrained | ✓ |
| ParametersInPointGet | error | RPC-Get-V1-08 | — | Unconstrained | ✓ |
| ParametersInPost | error | RPC-POST-V1-05 | — | Unconstrained | ✓ |
| ParametersOrder | error | — | — | Infallible | ✓ |
| ParametersSchemaAsTypeObject | error | RPC-POST-V1-05 | — | Unconstrained | ✓ |
| PatchBodyParametersSchema | error | RPC-Patch-V1-10 | — | Unconstrained | ✓ |
| PatchIdentityProperty | error | RPC-Patch-V1-11 | — | Unconstrained | ✓ |
| PatchPropertiesCorrespondToPutProperties | error | RPC-Patch-V1-01 | — | Unconstrained | ✓ |
| PatchResponseCodes | error | RPC-Patch-V1-06 | — | Template-enforced | ✓ |
| PatchSkuProperty | warn | RPC-Patch-V1-09 | — | Unconstrained | ✓ |
| PathContainsResourceGroup | error | RPC-Uri-V1-02 | — | Template-enforced | ✓ |
| PathContainsResourceType | error | RPC-Uri-V1-04 | — | Template-enforced | ✓ |
| PathContainsSubscriptionId | error | RPC-Uri-V1-01 | — | Template-enforced | ✓ |
| PathForNestedResource | error | RPC-Uri-V1-06 | — | Unconstrained | ✓ |
| PathForResourceAction | error | RPC-Uri-V1-07, RPC-POST-V1-01, RPC-POST-V1-07 | — | Unconstrained | ✓ |
| PathForTrackedResourceTypes | error | RPC-Put-V1-01, RPC-Get-V1-11 | — | Unconstrained | ✓ |
| PathResourceProviderMatchNamespace | error | RPC-Uri-V1-03 | — | Template-enforced | ✓ |
| PathResourceProviderNamePascalCase | error | — | — | Template-enforced | ✓ |
| PathResourceTypeNameCamelCase | error | — | — | Unconstrained | ✓ |
| PostOperationIdContainsUrlVerb | warning | — | — | Unconstrained | ✓ |
| PostResponseCodes | error | RPC-Async-V1-11, RPC-Async-V1-14, RPC-POST-V1-02, RPC-POST-V1-03 | `@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes` | Template-enforced | ✓ |
| PreviewVersionOverOneYear | warning | — | — | Unconstrained | ✓ |
| PrivateEndpointResourceSchemaValidation | error | — | — | Unconstrained | ✓ |
| PropertiesTypeObjectNoDefinition | error | RPC-Policy-V1-03 | — | Unconstrained | ✓ |
| ProvisioningStateMustBeReadOnly | error | RPC-Async-V1-16 | `@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state` | Template-enforced | ✓ |
| ProvisioningStateSpecifiedForLROPatch | error | RPC-Async-V1-02 | — | Template-enforced | — |
| ProvisioningStateSpecifiedForLROPut | error | RPC-Async-V1-02 | — | Template-enforced | — |
| ProvisioningStateValidation | error | RPC-Async-V1-03 | `@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state` | Template-enforced | ✓ |
| PutGetPatchResponseSchema | error | RPC-Put-V1-12 | — | Unconstrained | ✓ |
| PutRequestResponseSchemeArm | error | RPC-Put-V1-25 | — | Unconstrained | ✓ |
| PutResponseCodes | error | RPC-Async-V1-01, RPC-Put-V1-11 | `@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes` | Template-enforced | ✓ |
| QueryParametersInCollectionGet | error | RPC-Get-V1-15 | — | Unconstrained | ✓ |
| RepeatedPathInfo | error | RPC-Put-V1-05 | — | Unconstrained | ✓ |
| RequestBodyMustExistForPutPatch | error | RPC-Put-V1-28, RPC-Patch-V1-12 | — | Template-enforced | ✓ |
| RequestSchemaForTrackedResourcesMustHaveTags | error | RPC-Put-V1-07 | — | Template-enforced | — |
| RequiredDefaultResponse | error | — | — | Template-enforced | ✓ |
| RequiredPropertiesMissingInResourceModel | error | RPC-Get-V1-03, RPC-Put-V1-08 | — | Template-enforced | ✓ |
| RequiredReadOnlySystemData | warning | — | — | Template-enforced | ✓ |
| ReservedResourceNamesModelAsEnum | warn | RPC-ConstrainedCollections-V1-04 | — | Unconstrained | ✓ |
| ResourceNameRestriction | error | RPC-Uri-V1-05 | `@azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern` | Unconstrained | ✓ |
| ResponseSchemaSpecifiedForSuccessStatusCode | error | RPC-Put-V1-24 | — | Unconstrained | ✓ |
| SecurityDefinitionsStructure | error | — | — | Template-enforced | ✓ |
| SubscriptionIdParameterInOperations | error | — | — | Infallible | ✓ |
| SubscriptionsAndResourceGroupCasing | error | — | — | Template-enforced | ✓ |
| SystemDataDefinitionsCommonTypes | error | RPC-SystemData-V1-01, RPC-SystemData-V1-02 | — | Prerequisite-blocked | ✓ |
| SystemDataInPropertiesBag | error | RPC-SystemData-V1-01, RPC-SystemData-V1-02 | — | Unconstrained | ✓ |
| TagsAreNotAllowedForProxyResources | error | RPC-Put-V1-31 | — | Unconstrained | ✓ |
| TenantLevelAPIsNotAllowed | warn | RPC-Uri-V1-11 | — | Unconstrained | — |
| TopLevelResourcesListByResourceGroup | error | RPC-Get-V1-05 | — | Unconstrained | ✓ |
| TopLevelResourcesListBySubscription | error | RPC-Get-V1-05 | — | Unconstrained | ✓ |
| TrackedExtensionResourcesAreNotAllowed | error | RPC-Uri-V1-12 | — | Unconstrained | ✓ |
| TrackedResourceBeyondsThirdLevel | error | RPC-Put-V1-19 | — | Unconstrained | — |
| TrackedResourcePatchOperation | error | — | — | Unconstrained | ✓ |
| TrackedResourcesMustHavePut | error | RPC-Put-V1-22 | — | Unconstrained | ✓ |
| UniqueClientParameterName | error | — | — | Infallible | ✓ |
| UniqueModelName | error | — | — | Infallible | ✓ |
| UniqueXmsEnumName | error | — | — | Unconstrained | ✓ |
| UniqueXmsExample | warning | — | — | Unconstrained | ✓ |
| UnSupportedPatchProperties | error | RPC-Patch-V1-02 | — | Unconstrained | ✓ |
| ValidQueryParametersForPointOperations | error | RPC-Uri-V1-13 | — | Unconstrained | ✓ |
| ValidResponseCodeRequired | error | — | — | Infallible | ✓ |
| XmsEnumValidation | error | — | — | Unconstrained | ✓ |
| XmsIdentifierValidation | warning | — | — | Unconstrained | ✓ |
| XMSLongRunningOperationProperty | error | RPC-Async-V1-15 | — | Unconstrained | — |
| XmsPageableForListCalls | error | RPC-Get-V1-11 | — | Template-enforced | ✓ |
| XmsPageableListByRGAndSubscriptions | warning | — | — | Unconstrained | — |
| XmsPageableMustHaveCorrespondingResponse | error | — | — | Unconstrained | ✓ |
| XmsResourceInPutResponse | error | RPC-Put-V1-12 | — | Prerequisite-blocked | ✓ |
| XMSSecretInResponse | error | RPC-Put-V1-13 | — | Unconstrained | — |

### Common (ARM + DataPlane) (41 rules)

| Rule | Severity | RPC Code | TSP Equivalent | Tier | Doc |
|------|----------|----------|----------------|------|-----|
| ArraySchemaMustHaveItems | error | — | — | Infallible | ✓ |
| AvoidAnonymousParameter | error | — | — | Infallible | — |
| AvoidAnonymousTypes | error | — | — | Infallible | ✓ |
| AvoidMsdnReferences | warn | — | — | Unconstrained | ✓ |
| AvoidNestedProperties | warn | — | — | Unconstrained | ✓ |
| DefaultInEnum | error | — | — | Unconstrained | ✓ |
| DeleteInOperationName | warn | — | — | Template-enforced | ✓ |
| DescriptiveDescriptionRequired | error | — | — | Unconstrained | ✓ |
| docLinkLocale | error | — | — | Unconstrained | ✓ |
| EnumInsteadOfBoolean | warn | — | — | Unconstrained | ✓ |
| ExtensionResourcePathPattern | error | — | — | Unconstrained | ✓ |
| GetInOperationName | warn | — | — | Template-enforced | ✓ |
| InvalidVerbUsed | error | — | — | Infallible | ✓ |
| ListInOperationName | warn | — | — | Template-enforced | ✓ |
| LongRunningOperationsOptionsValidator | warn | — | — | Template-enforced | ✓ |
| LroExtension | error | — | — | Prerequisite-blocked | ✓ |
| LroStatusCodesReturnTypeSchema | error | — | — | Template-enforced | ✓ |
| MutabilityWithReadOnly | error | — | — | Prerequisite-blocked | ✓ |
| NamePropertyDefinitionInParameter | error | — | — | Infallible | ✓ |
| NextLinkPropertyMustExist | error | — | — | Unconstrained | ✓ |
| NonEmptyClientName | error | — | — | Infallible | ✓ |
| OperationIdNounConflictingModelNames | warn | — | — | Unconstrained | ✓ |
| OperationIdNounVerb | error | — | — | Unconstrained | ✓ |
| OperationIdSingleUnderscore | error | — | — | Infallible | — |
| OperationSummaryOrDescription | warn | — | `@azure-tools/typespec-azure-core/documentation-required` | Unconstrained | ✓ |
| PageableRequires200Response | error | — | — | Unconstrained | ✓ |
| ParameterDescription | warn | — | `@azure-tools/typespec-azure-core/documentation-required` | Unconstrained | ✓ |
| ParameterDescriptionRequired | error | — | `@azure-tools/typespec-azure-core/documentation-required` | Unconstrained | ✓ |
| PatchInOperationName | warn | — | — | Template-enforced | ✓ |
| PutInOperationName | warn | — | — | Template-enforced | ✓ |
| ResourceHasXMsResourceEnabled | error | — | — | Template-enforced | ✓ |
| Rpaas_ResourceProvisioningState | error | — | — | Unconstrained | — |
| SchemaDescriptionOrTitle | warn | — | `@azure-tools/typespec-azure-core/documentation-required` | Unconstrained | ✓ |
| SummaryAndDescriptionMustNotBeSame | warn | — | — | Unconstrained | ✓ |
| ValidFormats | error | — | — | Unconstrained | ✓ |
| XmsClientName | error | — | — | Unconstrained | — |
| XmsClientNameParameter | warn | — | — | Unconstrained | ✓ |
| XmsClientNameProperty | warn | — | — | Unconstrained | ✓ |
| XmsExamplesRequired | warn | — | — | Unconstrained | ✓ |
| XmsParameterLocation | error | — | — | Unconstrained | ✓ |
| XmsPathsMustOverloadPaths | error | — | — | Unconstrained | ✓ |

### DataPlane Only (37 rules)

| Rule | Severity | RPC Code | TSP Equivalent | Tier | Doc |
|------|----------|----------|----------------|------|-----|
| AdditionalPropertiesAndProperties | warn | — | `@azure-tools/typespec-azure-core/bad-record-type` | Unconstrained | ✓ |
| AdditionalPropertiesObject | warn | — | — | Unconstrained | ✓ |
| ApiVersionEnum | warn | — | — | Unconstrained | ✓ |
| ConsistentResponseBody | warn | — | — | Unconstrained | ✓ |
| DefaultResponse | warn | — | — | Template-enforced | ✓ |
| Delete204Response | warn | — | — | Template-enforced | ✓ |
| ErrorResponse | warn | — | — | Unconstrained | ✓ |
| Formdata | warn | — | — | Unconstrained | ✓ |
| HeaderDisallowed | warn | — | — | Unconstrained | ✓ |
| HostParametersValidation | error | — | — | Infallible | ✓ |
| LongRunningResponseStatusCodeDataPlane | error | — | — | Unconstrained | ✓ |
| LroHeaders | warn | — | — | Unconstrained | ✓ |
| MsPaths | warn | — | — | Unconstrained | ✓ |
| Nullable | warn | — | `@azure-tools/typespec-azure-core/no-nullable` | Unconstrained | ✓ |
| OperationId | warn | — | — | Template-enforced | ✓ |
| PaginationResponse | warn | — | — | Unconstrained | ✓ |
| ParameterDefaultNotAllowed | warn | — | — | Unconstrained | ✓ |
| ParameterNamesConvention | warn | — | — | Unconstrained | ✓ |
| ParameterNamesUnique | warn | — | — | Unconstrained | ✓ |
| ParameterOrder | warn | — | — | Infallible | ✓ |
| PatchContentType | warn | — | — | Infallible | ✓ |
| PathCharacters | warn | — | — | Unconstrained | ✓ |
| PathParameterNames | warn | — | — | Unconstrained | ✓ |
| PathParameterSchema | warn | — | — | Unconstrained | ✓ |
| Post201Response | warn | — | — | Unconstrained | ✓ |
| PropertyDescription | warn | — | `@azure-tools/typespec-azure-core/documentation-required` | Unconstrained | ✓ |
| PropertyType | warn | — | — | Unconstrained | ✓ |
| PutPath | warn | — | — | Unconstrained | ✓ |
| PutRequestResponseScheme | warn | — | — | Unconstrained | ✓ |
| RequestBodyNotAllowed | warn | — | — | Unconstrained | ✓ |
| RequestBodyOptional | warn | — | — | Unconstrained | ✓ |
| SchemaNamesConvention | warn | — | `@azure-tools/typespec-azure-core/casing-style` | Unconstrained | ✓ |
| SchemaTypeAndFormat | warn | — | — | Unconstrained | ✓ |
| SecurityDefinitionDescription | warn | — | — | Unconstrained | ✓ |
| SuccessResponseBody | warn | — | — | Unconstrained | ✓ |
| VersionConvention | warn | — | — | Unconstrained | ✓ |
| VersionPolicy | warn | — | — | Unconstrained | ✓ |

