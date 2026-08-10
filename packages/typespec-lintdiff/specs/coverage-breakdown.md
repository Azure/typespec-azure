# Observed validator and TypeSpec coverage breakdown

Specs commit: `f6b53f105b95da05276530a0754a1c71b4f16397`

Scope: full (462/468 projects)

Analysis duration: 1488689 ms

Only successfully compiled TypeSpec projects are included in validator and TypeSpec counts.

Official mappings and fixture coverage kinds are context only. Coverage is credited only for diagnostics that overlap in the same successful project.

Categories are investigative views and may overlap (for example, an unmapped rule may also have never fired).

## Summary

| Category | Count |
| --- | ---: |
| Known validator rules | 215 |
| 100% observed coverage | 16 |
| Partial observed coverage | 25 |
| Zero observed coverage | 31 |
| Unmapped validator rules | 115 |
| Validator rules never fired | 94 |
| TypeSpec-only / unmapped TypeSpec rules | 1 |

## Column definitions

- **Validator Rule**: validator rule identifier from the catalog, fixtures, or validator results.
- **CovKind**: fixture `coverageKind` value, or `unknown` when no fixture supplies it.
- **Fired**: included projects where the validator rule fired.
- **TSP Fired**: included projects where at least one mapped TypeSpec rule fired.
- **Lint/Overlap**: validator projects with a mapped TypeSpec diagnostic in the same project.
- **Gap**: validator projects without a mapped TypeSpec diagnostic.
- **TSP Only**: included projects where a mapped TypeSpec rule fired without the validator rule.
- **Observed %**: Lint/Overlap divided by validator projects; unavailable when the denominator is zero.
- **Official Mapping**: whether any mapped rule starts with `@azure-tools/`; mapping alone receives no coverage credit.
- **Fired TSP Rules**: mapped rules that actually emitted diagnostics in successful projects.
- **Mapped TSP Rules**: all fixture `tspLints` mappings.
- **Validator Diagnostics** and **TSP Diagnostics**: raw validator count and successful-project mapped TypeSpec diagnostic count.

## 100% observed coverage (16)

| Validator Rule | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| DeleteInOperationName | lint | 9 | 19 | 9 | 0 | 10 | 100.0% | no | tsp-lintdiff-local-linter/delete-in-operation-name | tsp-lintdiff-local-linter/delete-in-operation-name | 25 | 76 |
| EnumInsteadOfBoolean | unknown | 293 | 293 | 293 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/enum-instead-of-boolean | tsp-lintdiff-local-linter/enum-instead-of-boolean | 5777 | 4168 |
| EvenSegmentedPathForPutOperation | lint | 21 | 22 | 21 | 0 | 1 | 100.0% | no | tsp-lintdiff-local-linter/even-segmented-path-for-put-operation | tsp-lintdiff-local-linter/even-segmented-path-for-put-operation | 81 | 82 |
| GetResponseCodes | lint | 15 | 19 | 15 | 0 | 4 | 100.0% | no | tsp-lintdiff-local-linter/get-response-codes | tsp-lintdiff-local-linter/get-response-codes | 96 | 120 |
| LroErrorContent | lint | 54 | 55 | 54 | 0 | 1 | 100.0% | no | tsp-lintdiff-local-linter/lro-error-content | tsp-lintdiff-local-linter/lro-error-content | 639 | 644 |
| LroExtension | lint | 14 | 14 | 14 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/lro-extension | tsp-lintdiff-local-linter/lro-extension | 39 | 39 |
| NoErrorCodeResponses | lint | 20 | 20 | 20 | 0 | 0 | 100.0% | yes | tsp-lintdiff-local-linter/no-error-code-responses | @azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes<br>tsp-lintdiff-local-linter/no-error-code-responses | 144 | 146 |
| NonApplicationJsonType | unknown | 3 | 3 | 3 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/non-application-json-type | tsp-lintdiff-local-linter/non-application-json-type | 20 | 19 |
| ParametersInPointGet | lint | 40 | 65 | 40 | 0 | 25 | 100.0% | no | tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations | tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations | 189 | 749 |
| PatchInOperationName | lint | 14 | 24 | 14 | 0 | 10 | 100.0% | no | tsp-lintdiff-local-linter/patch-in-operation-name | tsp-lintdiff-local-linter/patch-in-operation-name | 14 | 63 |
| PreviewVersionOverOneYear | lint | 108 | 173 | 108 | 0 | 65 | 100.0% | no | tsp-lintdiff-local-linter/preview-version-over-one-year | tsp-lintdiff-local-linter/preview-version-over-one-year | 358 | 248 |
| PutInOperationName | lint | 52 | 55 | 52 | 0 | 3 | 100.0% | no | tsp-lintdiff-local-linter/put-in-operation-name | tsp-lintdiff-local-linter/put-in-operation-name | 133 | 186 |
| RepeatedPathInfo | unknown | 25 | 25 | 25 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/repeated-path-info | tsp-lintdiff-local-linter/repeated-path-info | 61 | 62 |
| SubscriptionsAndResourceGroupCasing | lint | 6 | 6 | 6 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing | tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing | 26 | 38 |
| SummaryAndDescriptionMustNotBeSame | lint | 37 | 37 | 37 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/summary-and-description-must-not-be-same | tsp-lintdiff-local-linter/summary-and-description-must-not-be-same | 679 | 705 |
| XMSLongRunningOperationProperty | lint | 3 | 3 | 3 | 0 | 0 | 100.0% | no | tsp-lintdiff-local-linter/xms-long-running-operation-property | tsp-lintdiff-local-linter/xms-long-running-operation-property | 6 | 6 |

## Partial observed coverage (25)

| Validator Rule | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| AllResourcesMustHaveGetOperation | lint | 11 | 2 | 1 | 10 | 1 | 9.1% | no | tsp-lintdiff-local-linter/all-resources-must-have-get-operation | tsp-lintdiff-local-linter/all-resources-must-have-get-operation | 23 | 3 |
| ConsistentPatchProperties | lint | 27 | 27 | 23 | 4 | 4 | 85.2% | no | tsp-lintdiff-local-linter/consistent-patch-properties | tsp-lintdiff-local-linter/consistent-patch-properties | 151 | 122 |
| DescriptionMustNotBeNodeName | lint | 105 | 5 | 2 | 103 | 3 | 1.9% | no | tsp-lintdiff-local-linter/description-must-not-be-node-name | tsp-lintdiff-local-linter/description-must-not-be-node-name | 70815 | 19 |
| GetCollectionOnlyHasValueAndNextLink | unknown | 61 | 60 | 58 | 3 | 2 | 95.1% | no | tsp-lintdiff-local-linter/get-collection-only-has-value-and-next-link | tsp-lintdiff-local-linter/get-collection-only-has-value-and-next-link | 290 | 267 |
| GetInOperationName | lint | 26 | 63 | 25 | 1 | 38 | 96.2% | no | tsp-lintdiff-local-linter/get-in-operation-name | tsp-lintdiff-local-linter/get-in-operation-name | 39 | 450 |
| GuidUsage | lint | 48 | 32 | 27 | 21 | 5 | 56.3% | no | tsp-lintdiff-local-linter/guid-usage | tsp-lintdiff-local-linter/guid-usage | 281 | 184 |
| ImplementPrivateEndpointAPIs | lint | 3 | 27 | 2 | 1 | 25 | 66.7% | no | tsp-lintdiff-local-linter/implement-private-endpoint-apis | tsp-lintdiff-local-linter/implement-private-endpoint-apis | 10 | 33 |
| LatestVersionOfCommonTypesMustBeUsed | lint | 388 | 388 | 381 | 7 | 7 | 98.2% | no | tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used | tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used | 40692 | 687 |
| ListInOperationName | lint | 53 | 71 | 47 | 6 | 24 | 88.7% | no | tsp-lintdiff-local-linter/list-in-operation-name | tsp-lintdiff-local-linter/list-in-operation-name | 172 | 391 |
| MissingXmsErrorResponse | unknown | 7 | 3 | 3 | 4 | 0 | 42.9% | no | tsp-lintdiff-local-linter/missing-xms-error-response | tsp-lintdiff-local-linter/missing-xms-error-response | 14 | 6 |
| NestedResourcesMustHaveListOperation | lint | 24 | 33 | 17 | 7 | 16 | 70.8% | no | tsp-lintdiff-local-linter/nested-resources-must-have-list-operation | tsp-lintdiff-local-linter/nested-resources-must-have-list-operation | 53 | 62 |
| OperationIdNounVerb | unknown | 34 | 54 | 27 | 7 | 27 | 79.4% | no | tsp-lintdiff-local-linter/operation-id-noun-verb | tsp-lintdiff-local-linter/operation-id-noun-verb | 111 | 263 |
| ParametersInPost | unknown | 32 | 24 | 24 | 8 | 0 | 75.0% | no | tsp-lintdiff-local-linter/parameters-in-post | tsp-lintdiff-local-linter/parameters-in-post | 424 | 167 |
| ParametersSchemaAsTypeObject | unknown | 9 | 10 | 4 | 5 | 6 | 44.4% | no | tsp-lintdiff-local-linter/parameters-schema-as-type-object | tsp-lintdiff-local-linter/parameters-schema-as-type-object | 18 | 63 |
| PatchBodyParametersSchema | partial | 93 | 128 | 89 | 4 | 39 | 95.7% | no | tsp-lintdiff-local-linter/patch-body-parameters-schema | tsp-lintdiff-local-linter/patch-body-parameters-schema | 703 | 1230 |
| PathResourceProviderNamePascalCase | unknown | 17 | 12 | 6 | 11 | 6 | 35.3% | no | tsp-lintdiff-local-linter/path-resource-provider-name-pascal-case | tsp-lintdiff-local-linter/path-resource-provider-name-pascal-case | 401 | 13 |
| PostOperationIdContainsUrlVerb | lint | 96 | 99 | 94 | 2 | 5 | 97.9% | no | tsp-lintdiff-local-linter/post-operation-id-contains-url-verb | tsp-lintdiff-local-linter/post-operation-id-contains-url-verb | 415 | 510 |
| PutRequestResponseSchemeArm | lint | 36 | 42 | 34 | 2 | 8 | 94.4% | yes | tsp-lintdiff-local-linter/put-request-response-scheme-arm | @azure-tools/typespec-azure-resource-manager/arm-resource-operation-response<br>tsp-lintdiff-local-linter/put-request-response-scheme-arm | 160 | 184 |
| TenantLevelAPIsNotAllowed | unknown | 24 | 15 | 15 | 9 | 0 | 62.5% | no | tsp-lintdiff-local-linter/tenant-level-apis-not-allowed | tsp-lintdiff-local-linter/tenant-level-apis-not-allowed | 24 | 48 |
| TopLevelResourcesListByResourceGroup | unknown | 3 | 8 | 1 | 2 | 7 | 33.3% | no | tsp-lintdiff-local-linter/top-level-resources-list-by-resource-group | tsp-lintdiff-local-linter/top-level-resources-list-by-resource-group | 3 | 9 |
| TrackedResourcePatchOperation | lint | 42 | 32 | 18 | 24 | 14 | 42.9% | no | tsp-lintdiff-local-linter/tracked-resource-patch-operation | tsp-lintdiff-local-linter/tracked-resource-patch-operation | 140 | 83 |
| TrackedResourcesMustHavePut | unknown | 20 | 41 | 10 | 10 | 31 | 50.0% | no | tsp-lintdiff-local-linter/tracked-resources-must-have-put | tsp-lintdiff-local-linter/tracked-resources-must-have-put | 50 | 62 |
| UnSupportedPatchProperties | lint | 45 | 24 | 7 | 38 | 17 | 15.6% | no | tsp-lintdiff-local-linter/unsupported-patch-properties | tsp-lintdiff-local-linter/unsupported-patch-properties | 107 | 131 |
| XmsExamplesRequired | lint | 5 | 458 | 4 | 1 | 454 | 80.0% | no | tsp-lintdiff-local-linter/xms-examples-required | tsp-lintdiff-local-linter/xms-examples-required | 443 | 14507 |
| XmsPageableForListCalls | lint | 75 | 24 | 24 | 51 | 0 | 32.0% | no | tsp-lintdiff-local-linter/xms-pageable-for-list-calls | tsp-lintdiff-local-linter/xms-pageable-for-list-calls | 254 | 43 |

## Zero observed coverage (31)

| Validator Rule | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| AllProxyResourcesShouldHaveDelete | unknown | 51 | 0 | 0 | 51 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/no-resource-delete-operation | 143 | 0 |
| AllTrackedResourcesMustHaveDelete | lint | 25 | 0 | 0 | 25 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/no-resource-delete-operation | 72 | 0 |
| APIVersionPattern | lint | 3 | 0 | 0 | 3 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format | 3 | 0 |
| ArmResourcePropertiesBag | unknown | 46 | 0 | 0 | 46 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property | 103 | 0 |
| AvoidAdditionalProperties | lint | 263 | 0 | 0 | 263 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-no-record | 1353 | 0 |
| AvoidAnonymousParameter | lint | 5 | 7 | 0 | 5 | 7 | 0.0% | no | tsp-lintdiff-local-linter/avoid-anonymous-parameter | tsp-lintdiff-local-linter/avoid-anonymous-parameter | 5 | 8 |
| AvoidAnonymousTypes | lint | 7 | 1 | 0 | 7 | 1 | 0.0% | no | tsp-lintdiff-local-linter/avoid-anonymous-types | tsp-lintdiff-local-linter/avoid-anonymous-types | 10 | 1 |
| BodyTopLevelProperties | lint | 54 | 0 | 0 | 54 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property | 591 | 0 |
| CollectionObjectPropertiesNaming | unknown | 2 | 0 | 0 | 2 | 0 | 0.0% | no | — | tsp-lintdiff-local-linter/collection-object-properties-naming | 3 | 0 |
| DefinitionsPropertiesNamesCamelCase | unknown | 53 | 0 | 0 | 53 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-core/casing-style | 535 | 0 |
| DeleteResponseCodes | lint | 106 | 0 | 0 | 106 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes<br>@azure-tools/typespec-azure-resource-manager/no-response-body | 535 | 0 |
| LroLocationHeader | lint | 43 | 0 | 0 | 43 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/lro-location-header | 139 | 0 |
| OperationIdNounConflictingModelNames | lint | 55 | 0 | 0 | 55 | 0 | 0.0% | no | — | tsp-lintdiff-local-linter/operation-id-noun-conflicting-model-names | 487 | 0 |
| OperationsAPIImplementation | lint | 234 | 0 | 0 | 234 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/missing-operations-endpoint | 374 | 0 |
| OperationSummaryOrDescription | unknown | 1 | 0 | 0 | 1 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-core/documentation-required | 1 | 0 |
| ParameterDescription | unknown | 43 | 0 | 0 | 43 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-core/documentation-required | 461 | 0 |
| PathResourceTypeNameCamelCase | lint | 9 | 0 | 0 | 9 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars | 62 | 0 |
| PostResponseCodes | unknown | 112 | 0 | 0 | 112 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes | 724 | 0 |
| ProvisioningStateMustBeReadOnly | lint | 91 | 0 | 0 | 91 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state | 1630 | 0 |
| ProvisioningStateValidation | lint | 16 | 0 | 0 | 16 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state | 18 | 0 |
| PutGetPatchResponseSchema | partial | 13 | 0 | 0 | 13 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-operation-response | 35 | 0 |
| PutResponseCodes | lint | 104 | 0 | 0 | 104 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes | 585 | 0 |
| ResourceNameRestriction | lint | 128 | 0 | 0 | 128 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern | 3431 | 0 |
| ResponseSchemaSpecifiedForSuccessStatusCode | unknown | 5 | 0 | 0 | 5 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/no-response-body | 8 | 0 |
| SchemaDescriptionOrTitle | unknown | 101 | 0 | 0 | 101 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-core/documentation-required | 6945 | 0 |
| SystemDataDefinitionsCommonTypes | lint | 2 | 0 | 0 | 2 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property | 3 | 0 |
| TrackedExtensionResourcesAreNotAllowed | unknown | 9 | 0 | 0 | 9 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property | 34 | 0 |
| TrackedResourceBeyondsThirdLevel | lint | 10 | 0 | 0 | 10 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/beyond-nesting-levels | 23 | 0 |
| XmsIdentifierValidation | lint | 110 | 0 | 0 | 110 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers | 1900 | 0 |
| XmsResourceInPutResponse | lint | 13 | 3 | 0 | 13 | 3 | 0.0% | no | tsp-lintdiff-local-linter/xms-resource-in-put-response | tsp-lintdiff-local-linter/xms-resource-in-put-response | 47 | 10 |
| XMSSecretInResponse | lint | 101 | 0 | 0 | 101 | 0 | 0.0% | yes | — | @azure-tools/typespec-azure-resource-manager/secret-prop | 1219 | 0 |

## Unmapped validator rules (115)

| Validator Rule | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| AdditionalPropertiesObject | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ApiHost | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ApiVersionEnum | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ArrayMustHaveType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ArraySchemaMustHaveItems | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| AvoidAnonymousSchema | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| AvoidEmptyResponseSchema | unknown | 3 | 0 | 0 | 3 | 0 | 0.0% | no | — | — | 61 | 0 |
| AvoidMsdnReferences | unknown | 9 | 0 | 0 | 9 | 0 | 0.0% | no | — | — | 314 | 0 |
| AvoidNestedProperties | blocked | 9 | 0 | 0 | 9 | 0 | 0.0% | no | — | — | 15 | 0 |
| AzureResourceTagsSchema | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| BodyParamRepeatedInfo | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ConsistentResponseBody | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ControlCharactersAreNotAllowed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DefaultErrorResponseSchema | template | 16 | 0 | 0 | 16 | 0 | 0.0% | no | — | — | 205 | 0 |
| DefaultInEnum | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DefaultResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| Delete204Response | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DeleteMustNotHaveRequestBody | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DeleteOperationResponses | template | 25 | 0 | 0 | 25 | 0 | 0.0% | no | — | — | 82 | 0 |
| DeleteResponseBodyEmpty | template | 20 | 0 | 0 | 20 | 0 | 0.0% | no | — | — | 44 | 0 |
| DeprecatedXmsCodeGenerationSetting | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| docLinkLocale | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumMustHaveType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumMustNotHaveEmptyValue | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumMustRespectType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumUniqueValue | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ErrorResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| Formdata | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| GetCollectionResponseSchema | unknown | 17 | 0 | 0 | 17 | 0 | 0.0% | no | — | — | 36 | 0 |
| GetMustNotHaveRequestBody | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| GetOperationMustNotBeLongRunning | template | 2 | 0 | 0 | 2 | 0 | 0.0% | no | — | — | 4 | 0 |
| HasApiVersionParameter | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HeaderDisallowed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HostParametersValidation | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HttpsSupportedScheme | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| IgnoredPropertyNextToRef | unknown | 101 | 0 | 0 | 101 | 0 | 0.0% | no | — | — | 128 | 0 |
| IntegerTypeMustHaveFormat | unknown | 2 | 0 | 0 | 2 | 0 | 0.0% | no | — | — | 5 | 0 |
| InvalidSkuModel | unknown | 7 | 0 | 0 | 7 | 0 | 0.0% | no | — | — | 7 | 0 |
| InvalidVerbUsed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LicenseHeaderMustNotBeSpecified | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LocationMustHaveXmsMutability | template | 89 | 0 | 0 | 89 | 0 | 0.0% | no | — | — | 503 | 0 |
| LongRunningResponseStatusCodeDataPlane | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LroHeaders | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LroOriginalUri | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LroPatch202 | unknown | 22 | 0 | 0 | 22 | 0 | 0.0% | no | — | — | 58 | 0 |
| LroPostMustNotUseOriginalUriAsFinalState | blocked | 1 | 0 | 0 | 1 | 0 | 0.0% | no | — | — | 1 | 0 |
| LroStatusCodesReturnTypeSchema | blocked | 2 | 0 | 0 | 2 | 0 | 0.0% | no | — | — | 5 | 0 |
| LroWithOriginalUriAsFinalState | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MissingDefaultResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MissingSegmentsInNestedResourceListOperation | unknown | 46 | 0 | 0 | 46 | 0 | 0.0% | no | — | — | 346 | 0 |
| MissingTypeObject | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MsPaths | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| NamePropertyDefinitionInParameter | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| NextLinkPropertyMustExist | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| NoDuplicatePathsForScopeParameter | blocked | 3 | 0 | 0 | 3 | 0 | 0.0% | no | — | — | 22 | 0 |
| NonEmptyClientName | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| Nullable | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationId | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationIdRequired | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationIdSingleUnderscore | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationsApiResponseSchema | template | 35 | 0 | 0 | 35 | 0 | 0.0% | no | — | — | 35 | 0 |
| OperationsApiSchemaUsesCommonTypes | unknown | 84 | 0 | 0 | 84 | 0 | 0.0% | no | — | — | 85 | 0 |
| OperationsApiTenantLevelOnly | blocked | 2 | 0 | 0 | 2 | 0 | 0.0% | no | — | — | 2 | 0 |
| PageableOperation | unknown | 67 | 0 | 0 | 67 | 0 | 0.0% | no | — | — | 171 | 0 |
| ParameterDefaultNotAllowed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParameterDescriptionRequired | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParameterNamesUnique | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParameterNotDefinedInGlobalParameters | unknown | 8 | 0 | 0 | 8 | 0 | 0.0% | no | — | — | 23 | 0 |
| ParameterNotUsingCommonTypes | template | 70 | 0 | 0 | 70 | 0 | 0.0% | no | — | — | 463 | 0 |
| ParameterOrder | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParametersOrder | unknown | 9 | 0 | 0 | 9 | 0 | 0.0% | no | — | — | 54 | 0 |
| PatchContentType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PatchIdentityProperty | template | 21 | 0 | 0 | 21 | 0 | 0.0% | no | — | — | 32 | 0 |
| PatchResponseCodes | template | 61 | 0 | 0 | 61 | 0 | 0.0% | no | — | — | 180 | 0 |
| PatchSkuProperty | template | 21 | 0 | 0 | 21 | 0 | 0.0% | no | — | — | 42 | 0 |
| PathContainsResourceGroup | template | 2 | 0 | 0 | 2 | 0 | 0.0% | no | — | — | 13 | 0 |
| PathContainsResourceType | template | 9 | 0 | 0 | 9 | 0 | 0.0% | no | — | — | 32 | 0 |
| PathContainsSubscriptionId | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PathForNestedResource | template | 20 | 0 | 0 | 20 | 0 | 0.0% | no | — | — | 95 | 0 |
| PathForResourceAction | blocked | 27 | 0 | 0 | 27 | 0 | 0.0% | no | — | — | 96 | 0 |
| PathForTrackedResourceTypes | template | 24 | 0 | 0 | 24 | 0 | 0.0% | no | — | — | 42 | 0 |
| PathResourceProviderMatchNamespace | template | 8 | 0 | 0 | 8 | 0 | 0.0% | no | — | — | 29 | 0 |
| PrivateEndpointResourceSchemaValidation | unknown | 3 | 0 | 0 | 3 | 0 | 0.0% | no | — | — | 3 | 0 |
| PropertyType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ProvisioningStateSpecifiedForLROPatch | blocked | 12 | 0 | 0 | 12 | 0 | 0.0% | no | — | — | 39 | 0 |
| ProvisioningStateSpecifiedForLROPut | blocked | 51 | 0 | 0 | 51 | 0 | 0.0% | no | — | — | 441 | 0 |
| RequestBodyMustExistForPutPatch | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| RequestSchemaForTrackedResourcesMustHaveTags | blocked | 26 | 0 | 0 | 26 | 0 | 0.0% | no | — | — | 67 | 0 |
| RequiredDefaultResponse | template | 7 | 0 | 0 | 7 | 0 | 0.0% | no | — | — | 178 | 0 |
| RequiredPropertiesMissingInResourceModel | unknown | 138 | 0 | 0 | 138 | 0 | 0.0% | no | — | — | 454 | 0 |
| RequiredReadOnlySystemData | unknown | 13 | 0 | 0 | 13 | 0 | 0.0% | no | — | — | 52 | 0 |
| ReservedResourceNamesModelAsEnum | unknown | 7 | 0 | 0 | 7 | 0 | 0.0% | no | — | — | 8 | 0 |
| ResourceHasXMsResourceEnabled | unknown | 3 | 0 | 0 | 3 | 0 | 0.0% | no | — | — | 3 | 0 |
| Rpaas_ResourceProvisioningState | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SchemaTypeAndFormat | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SecurityDefinitionsStructure | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SubscriptionIdParameterInOperations | unknown | 6 | 0 | 0 | 6 | 0 | 0.0% | no | — | — | 12 | 0 |
| SuccessResponseBody | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SystemDataInPropertiesBag | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| TopLevelResourcesListBySubscription | unknown | 9 | 0 | 0 | 9 | 0 | 0.0% | no | — | — | 10 | 0 |
| TrackedResourceTagsPropertyInRequest | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueClientParameterName | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueModelName | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueXmsEnumName | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueXmsExample | unknown | 86 | 0 | 0 | 86 | 0 | 0.0% | no | — | — | 495 | 0 |
| ValidFormats | unknown | 6 | 0 | 0 | 6 | 0 | 0.0% | no | — | — | 123 | 0 |
| ValidResponseCodeRequired | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| VersionConvention | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsClientName | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsClientNameParameter | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsClientNameProperty | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsEnumValidation | unknown | 1 | 0 | 0 | 1 | 0 | 0.0% | no | — | — | 1 | 0 |
| XmsPageableListByRGAndSubscriptions | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsParameterLocation | unknown | 3 | 0 | 0 | 3 | 0 | 0.0% | no | — | — | 6 | 0 |
| XmsPathsMustOverloadPaths | unknown | 1 | 0 | 0 | 1 | 0 | 0.0% | no | — | — | 1 | 0 |

## Validator rules never fired (94)

| Validator Rule | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| AdditionalPropertiesAndProperties | unknown | 0 | 0 | 0 | 0 | 0 | — | yes | — | @azure-tools/typespec-azure-core/bad-record-type | 0 | 0 |
| AdditionalPropertiesObject | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ApiHost | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ApiVersionEnum | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ApiVersionParameterRequired | lint | 0 | 0 | 0 | 0 | 0 | — | yes | — | @azure-tools/typespec-azure-core/operation-missing-api-version<br>@azure-tools/typespec-azure-resource-manager/arm-resource-operation | 0 | 0 |
| ArrayMustHaveType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ArraySchemaMustHaveItems | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| AvoidAnonymousSchema | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| AzureResourceTagsSchema | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| BodyParamRepeatedInfo | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ConsistentResponseBody | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ConsistentResponseSchemaForPut | lint | 0 | 1 | 0 | 0 | 1 | — | no | tsp-lintdiff-local-linter/consistent-response-schema-for-put | tsp-lintdiff-local-linter/consistent-response-schema-for-put | 0 | 1 |
| ControlCharactersAreNotAllowed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DefaultInEnum | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DefaultResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| Delete204Response | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DeleteMustNotHaveRequestBody | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DeprecatedXmsCodeGenerationSetting | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| DescriptiveDescriptionRequired | unknown | 0 | 3 | 0 | 0 | 3 | — | no | tsp-lintdiff-local-linter/descriptive-description-required | tsp-lintdiff-local-linter/descriptive-description-required | 0 | 5 |
| docLinkLocale | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumMustHaveType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumMustNotHaveEmptyValue | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumMustRespectType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| EnumUniqueValue | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ErrorResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ExtensionResourcePathPattern | lint | 0 | 40 | 0 | 0 | 40 | — | no | tsp-lintdiff-local-linter/extension-resource-path-pattern | tsp-lintdiff-local-linter/extension-resource-path-pattern | 0 | 556 |
| Formdata | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| GetMustNotHaveRequestBody | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HasApiVersionParameter | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HeaderDisallowed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HostParametersValidation | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| HttpsSupportedScheme | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| InvalidVerbUsed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LicenseHeaderMustNotBeSpecified | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LongRunningOperationsOptionsValidator | lint | 0 | 0 | 0 | 0 | 0 | — | no | — | tsp-lintdiff-local-linter/long-running-operations-options-validator | 0 | 0 |
| LongRunningResponseStatusCodeDataPlane | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LroHeaders | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LroOriginalUri | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| LroWithOriginalUriAsFinalState | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MissingDefaultResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MissingTypeObject | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MsPaths | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| MutabilityWithReadOnly | partial | 0 | 0 | 0 | 0 | 0 | — | no | — | tsp-lintdiff-local-linter/mutability-with-read-only | 0 | 0 |
| NamePropertyDefinitionInParameter | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| NextLinkPropertyMustExist | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| NonEmptyClientName | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| Nullable | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationId | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationIdRequired | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| OperationIdSingleUnderscore | blocked | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PageableRequires200Response | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | tsp-lintdiff-local-linter/pageable-requires-200-response | 0 | 0 |
| PaginationResponse | unknown | 0 | 3 | 0 | 0 | 3 | — | no | tsp-lintdiff-local-linter/pagination-response | tsp-lintdiff-local-linter/pagination-response | 0 | 5 |
| ParameterDefaultNotAllowed | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParameterDescriptionRequired | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParameterNamesConvention | unknown | 0 | 108 | 0 | 0 | 108 | — | no | tsp-lintdiff-local-linter/parameter-names-convention | tsp-lintdiff-local-linter/parameter-names-convention | 0 | 2592 |
| ParameterNamesUnique | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ParameterOrder | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PatchContentType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PatchPropertiesCorrespondToPutProperties | lint | 0 | 27 | 0 | 0 | 27 | — | no | tsp-lintdiff-local-linter/consistent-patch-properties | tsp-lintdiff-local-linter/consistent-patch-properties | 0 | 122 |
| PathCharacters | unknown | 0 | 10 | 0 | 0 | 10 | — | no | tsp-lintdiff-local-linter/path-characters | tsp-lintdiff-local-linter/path-characters | 0 | 20 |
| PathContainsSubscriptionId | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PathParameterNames | unknown | 0 | 102 | 0 | 0 | 102 | — | no | tsp-lintdiff-local-linter/path-parameter-names | tsp-lintdiff-local-linter/path-parameter-names | 0 | 3180 |
| PathParameterSchema | unknown | 0 | 310 | 0 | 0 | 310 | — | no | tsp-lintdiff-local-linter/path-parameter-schema | tsp-lintdiff-local-linter/path-parameter-schema | 0 | 11381 |
| Post201Response | unknown | 0 | 2 | 0 | 0 | 2 | — | no | tsp-lintdiff-local-linter/post-201-response | tsp-lintdiff-local-linter/post-201-response | 0 | 6 |
| PropertiesTypeObjectNoDefinition | lint | 0 | 0 | 0 | 0 | 0 | — | yes | — | @azure-tools/typespec-azure-resource-manager/no-empty-model | 0 | 0 |
| PropertyDescription | unknown | 0 | 0 | 0 | 0 | 0 | — | yes | — | @azure-tools/typespec-azure-core/documentation-required | 0 | 0 |
| PropertyType | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| PutPath | lint | 0 | 1 | 0 | 0 | 1 | — | no | tsp-lintdiff-local-linter/put-path | tsp-lintdiff-local-linter/put-path | 0 | 1 |
| PutRequestResponseScheme | lint | 0 | 2 | 0 | 0 | 2 | — | no | tsp-lintdiff-local-linter/put-request-response-scheme | tsp-lintdiff-local-linter/put-request-response-scheme | 0 | 4 |
| QueryParametersInCollectionGet | unknown | 0 | 93 | 0 | 0 | 93 | — | no | tsp-lintdiff-local-linter/query-parameters-in-collection-get | tsp-lintdiff-local-linter/query-parameters-in-collection-get | 0 | 1439 |
| RequestBodyMustExistForPutPatch | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| RequestBodyNotAllowed | lint | 0 | 2 | 0 | 0 | 2 | — | no | tsp-lintdiff-local-linter/request-body-not-allowed | tsp-lintdiff-local-linter/request-body-not-allowed | 0 | 11 |
| RequestBodyOptional | unknown | 0 | 3 | 0 | 0 | 3 | — | no | tsp-lintdiff-local-linter/request-body-optional | tsp-lintdiff-local-linter/request-body-optional | 0 | 5 |
| Rpaas_ResourceProvisioningState | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SchemaNamesConvention | unknown | 0 | 0 | 0 | 0 | 0 | — | yes | — | @azure-tools/typespec-azure-core/casing-style | 0 | 0 |
| SchemaTypeAndFormat | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SecurityDefinitionDescription | lint | 0 | 0 | 0 | 0 | 0 | — | no | — | tsp-lintdiff-local-linter/security-definition-description | 0 | 0 |
| SecurityDefinitionsStructure | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SuccessResponseBody | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| SystemDataInPropertiesBag | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| TagsAreNotAllowedForProxyResources | lint | 0 | 17 | 0 | 0 | 17 | — | no | tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources | tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources | 0 | 57 |
| TrackedResourceTagsPropertyInRequest | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueClientParameterName | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueModelName | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| UniqueXmsEnumName | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| ValidQueryParametersForPointOperations | unknown | 0 | 65 | 0 | 0 | 65 | — | no | tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations | tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations | 0 | 749 |
| ValidResponseCodeRequired | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| VersionConvention | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| VersionPolicy | lint | 0 | 0 | 0 | 0 | 0 | — | yes | — | @azure-tools/typespec-azure-core/operation-missing-api-version<br>tsp-lintdiff-local-linter/version-policy | 0 | 0 |
| XmsClientName | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsClientNameParameter | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsClientNameProperty | template | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsPageableListByRGAndSubscriptions | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | — | 0 | 0 |
| XmsPageableMustHaveCorrespondingResponse | unknown | 0 | 0 | 0 | 0 | 0 | — | no | — | tsp-lintdiff-local-linter/xms-pageable-must-have-corresponding-response | 0 | 0 |

## TypeSpec-only / unmapped TypeSpec rules (1)

| TypeSpec Rule | Projects | Diagnostics | Project List |
| --- | ---: | ---: | --- |
| @typespec/http/metadata-ignored | 5 | 113 | specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge<br>specification/powerplatform/resource-manager/Microsoft.PowerPlatform/PowerPlatform<br>specification/signalr/resource-manager/Microsoft.SignalRService/SignalRService<br>specification/web/resource-manager/Microsoft.Web/AppService<br>specification/webpubsub/resource-manager/Microsoft.SignalRService/SignalRService |
