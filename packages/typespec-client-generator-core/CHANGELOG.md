# Change Log - @azure-tools/typespec-client-generator-core

## 0.65.2

### Bug Fixes

- [#3945](https://github.com/Azure/typespec-azure/pull/3945) Fix duplicate client name error when using generic union or model templates with different type parameters.


## 0.65.1

### Bug Fixes

- [#3929](https://github.com/Azure/typespec-azure/pull/3929) Changed `InitializedByFlags.Default` back to `0` to indicate no user-specific initialization setting for sub clients. Renamed `InitializedByFlags.None` to `InitializedByFlags.CustomizeCode` (value 4) and `InitializedBy.none` to `InitializedBy.customizeCode` to indicate that client initialization should be omitted from generated code and handled manually in custom code.


## 0.65.0

### Deprecations

- [#3732](https://github.com/Azure/typespec-azure/pull/3732) The `service` property in `SdkOperationGroup` and `SdkClient` is now deprecated. Use the new `services` property instead, which supports multiple services. The deprecated `service` property will return `services[0]` for single service scenarios or the full `services` array for multi-service scenarios. This property will be removed in a future release.

### Features

- [#3764](https://github.com/Azure/typespec-azure/pull/3764) Add `.crossLanguageDefinitionId`. to `SdkEnumValueType`
- [#3877](https://github.com/Azure/typespec-azure/pull/3877) Added `InitializedBy.customizeCode` (value 4) to allow TypeSpec authors to indicate that client initialization should be omitted from generated code and handled manually in custom code. `InitializedByFlags.Default` remains `0` indicating no user-specific initialization setting for sub clients. Renamed `InitializedBy.none` to `InitializedBy.customizeCode` and `InitializedByFlags.None` to `InitializedByFlags.CustomizeCode`.
- [#3876](https://github.com/Azure/typespec-azure/pull/3876) Add full support for `Http.File` type with `BinarySerializationOptions` containing `isText`, `contentTypes`, and `filename` properties.
- [#3827](https://github.com/Azure/typespec-azure/pull/3827) Add `@clientOption` flag for experimental, language-specific flags
- [#3769](https://github.com/Azure/typespec-azure/pull/3769) Added `apiVersions` Map to `SdkPackage.metadata` to export API versions for multiple services. The Map key is the service namespace full qualified name, and the value is the version string. The existing `apiVersion` property is now deprecated and will be removed in a future release. For single service scenarios, both properties will be populated. For multiple service scenarios, only `apiVersions` will be populated while `apiVersion` will be undefined.
- [#3732](https://github.com/Azure/typespec-azure/pull/3732) Allow operation groups to contain operations from multiple services. Operation groups created via `@clientLocation` or automatically merged when multiple services have operation groups with the same name now support multi-service scenarios with empty `apiVersions` and string API version parameter type.

### Bug Fixes

- [#3797](https://github.com/Azure/typespec-azure/pull/3797) Do not check array type when applying encode for model property.
- [#3849](https://github.com/Azure/typespec-azure/pull/3849) Fix namespace duplication when `@clientNamespace` matches namespace flag
- [#3887](https://github.com/Azure/typespec-azure/pull/3887) Fixed apiVersion parameter clientDefaultValue missing when an operation group contains operations from different services.
- [#3885](https://github.com/Azure/typespec-azure/pull/3885) Fix regression with @clientOption negation scope handling. Decorators using negation scope patterns like '!python' or '!(java, python)' are now correctly filtered.
- [#3501](https://github.com/Azure/typespec-azure/pull/3501) Allow custom encoding strings in `SdkDateTimeTypeBase` and `SdkDurationType` by using union type `DateTimeKnownEncoding | string` and `DurationKnownEncoding | string`.
- [#3915](https://github.com/Azure/typespec-azure/pull/3915) Remove unused discriminated subtypes from discriminatedSubtypes map. When a base model has discriminated subtypes where some subtypes have no usage, only the unused subtypes are removed from the map while preserving discriminator info for used subtypes.
- [#3806](https://github.com/Azure/typespec-azure/pull/3806) The `apiVersion` parameter in client initialization is now correctly marked as `optional: true` for all client-level API version parameters, including both single-service and multi-service scenarios.
- [#3775](https://github.com/Azure/typespec-azure/pull/3775) Correctly detect name collisions with `--namespace` flag and or multi service usage
- [#3784](https://github.com/Azure/typespec-azure/pull/3784) Add warning when `@alternateType` decorator with external type information is applied to model properties. External types should be applied to the type definition itself (Scalar, Model, Enum, or Union) instead of model properties.


## 0.64.6

### Bug Fixes

- [#3890](https://github.com/Azure/typespec-azure/pull/3890) Fix regression with @clientOption negation scope handling. Decorators using negation scope patterns like '!python' or '!(java, python)' are now correctly filtered.
- [#3890](https://github.com/Azure/typespec-azure/pull/3890) Add `@clientOption` flag for experimental, language-specific flags


## 0.64.5

### Bug Fixes

- [#3861](https://github.com/Azure/typespec-azure/pull/3861) Update xml serialization name when there is no explicit decorator


## 0.64.4

### Bug Fixes

- [#3843](https://github.com/Azure/typespec-azure/pull/3843) Fix subscriptionId and apiVersion client parameters not propagating to top-level client when nested operation groups contain these parameters
- [#3833](https://github.com/Azure/typespec-azure/pull/3833) Add new `@Legacy.disablePageable` decorator to mark pageable operations as basic operations


## 0.64.3

### Bug Fixes

- [#3820](https://github.com/Azure/typespec-azure/pull/3820) Reduce param mapping time consumption.


## 0.64.2

### Bug Fixes

- [#3807](https://github.com/Azure/typespec-azure/pull/3807) Fix `@markAsPageable` decorator to populate `method.response.resultSegments` to match the behavior of native pageable operations, ensuring the array of properties to walk to get results from the response model is available.


## 0.64.1

### Bug Fixes

- [#3767](https://github.com/Azure/typespec-azure/pull/3767) Fix enum type exclusion in protocol methods when `@convenientAPI(false)`.
- [#3768](https://github.com/Azure/typespec-azure/pull/3768) Refine diagnostic for LRO and paging metadata generation.


## 0.64.0

### Features

- [#3660](https://github.com/Azure/typespec-azure/pull/3660) Add `@markAsPageable` decorator.
- [#3746](https://github.com/Azure/typespec-azure/pull/3746) #3693 Allow array and unknown result for async operations

### Bump dependencies

- [#3677](https://github.com/Azure/typespec-azure/pull/3677) Upgrade dependencies

### Bug Fixes

- [#3716](https://github.com/Azure/typespec-azure/pull/3716) Fix api-version parameter type to string for multi-service clients instead of using a specific enum type.
- [#3723](https://github.com/Azure/typespec-azure/pull/3723) Improve `@hierarchyBuilding` decorator diagnostic messages to include specific property names and conflict details when there are inherited property conflicts
- [#3717](https://github.com/Azure/typespec-azure/pull/3717) Remove mutation for validation.
- [#3611](https://github.com/Azure/typespec-azure/pull/3611) Generate names for anonymous models in LroMetadata.


## 0.63.4

### Bug Fixes

- [#3728](https://github.com/Azure/typespec-azure/pull/3728) Allow alternate types for models, enums, and unions


## 0.63.3

### Bug Fixes

- [#3700](https://github.com/Azure/typespec-azure/pull/3700) Fix wrong filtering of preview version value in version enum.


## 0.63.2

### Bug Fixes

- [#3687](https://github.com/Azure/typespec-azure/pull/3687) Fix `@hierarchyBuilding` decorator to recognize envelope properties.


## 0.63.1

### Features

- [#3617](https://github.com/Azure/typespec-azure/pull/3617) Add support for a single client from multiple services


## 0.63.0

### Breaking Changes

- [#3493](https://github.com/Azure/typespec-azure/pull/3493) Add `optional` property to `SdkMethodResponse` to distinguish responses without body from nullable body types.
- [#3495](https://github.com/Azure/typespec-azure/pull/3495) Filter read-only parameters from `SdkServiceMethod` parameters. Read-only parameters (those with `@visibility(Lifecycle.Read))` are now correctly excluded from method signatures since they cannot be set by the user.

### Features

- [#3625](https://github.com/Azure/typespec-azure/pull/3625) Add `@clientDefaultValue` decorator in Legacy namespace to support brownfield services that need to maintain backward compatibility with existing SDK default values from Swagger definitions.
- [#3583](https://github.com/Azure/typespec-azure/pull/3583) Support array encode on model property.
- [#3494](https://github.com/Azure/typespec-azure/pull/3494) Add `methodParameterSegments` property to replace `correspondingMethodParams` with complete path segments.
- [#3596](https://github.com/Azure/typespec-azure/pull/3596) Extend `@scope` decorator usage to `ModelProperty` targets.
- [#3496](https://github.com/Azure/typespec-azure/pull/3496) Support `@convenientAPI` and `@protocolAPI` decorators at namespace/interface level to enable decorator inheritance for all contained operations with explicit override support at the operation level.

### Bump dependencies

- [#3546](https://github.com/Azure/typespec-azure/pull/3546) Upgrade dependencies

### Bug Fixes

- [#3498](https://github.com/Azure/typespec-azure/pull/3498) Fix incorrect usage flags being set on types when `@alternateType` is applied to operation parameters. When a parameter has `@alternateType`, the original type should not receive usage flags since it's being replaced by the alternate type. This fix ensures the usage value correctly reflects that the original type is not used (Usage = 0/None).


## 0.62.0

### Features

- [#3422](https://github.com/Azure/typespec-azure/pull/3422) Add new `External` usage flag to `UsageFlags` enum. This flag is automatically set for types that are only referenced by external types (types with `@alternateType` decorator pointing to external library types). The flag propagates recursively through the type graph, marking all types that are exclusively accessible through external types.
- [#3401](https://github.com/Azure/typespec-azure/pull/3401) Add `@nextLinkVerb` decorator to specify HTTP verb for next page calls in paging operations. The decorator accepts "POST" or "GET" and defaults to "GET" when not specified. The `nextLinkVerb` field in `SdkPagingServiceMetadata` stores the HTTP verb as a string.
- [#3464](https://github.com/Azure/typespec-azure/pull/3464) Support discriminated union.
- [#3448](https://github.com/Azure/typespec-azure/pull/3448) add support for `Http.File` types as input and output

### Bump dependencies

- [#3447](https://github.com/Azure/typespec-azure/pull/3447) Upgrade dependencies october 2025

### Bug Fixes

- [#3451](https://github.com/Azure/typespec-azure/pull/3451) Propagate client initialization parameters to subclients


## 0.61.3

### Bug Fixes

- [#3439](https://github.com/Azure/typespec-azure/pull/3439) Support `@flattenProperty` on parameters.
- [#3441](https://github.com/Azure/typespec-azure/pull/3441) Fix usage of `@markAsLro` for lro operations with nullable overall response types


## 0.61.2

### Bug Fixes

- [#3426](https://github.com/Azure/typespec-azure/pull/3426) Fix `@alternateType` decorator incorrectly treating regular TypeSpec models as external types


## 0.61.1

### Bug Fixes

- [#3376](https://github.com/Azure/typespec-azure/pull/3376) Support `@clientLocation` for model property along with `@override`.


## 0.61.0

### Breaking Changes

- [#3286](https://github.com/Azure/typespec-azure/pull/3286) Change `isApiVersion` logic. If a service is not versioning, the function always return false.

### Features

- [#3198](https://github.com/Azure/typespec-azure/pull/3198) Add `getHttpOperationParametersForClientParameter` helper to find corresponding HTTP parameter list for a client initialization parameter.
- [#3325](https://github.com/Azure/typespec-azure/pull/3325) Add support for `@previewVersion` decorator in API version filtering. TCGC now checks for the `@previewVersion` decorator on enum members in addition to the existing regex-based preview version filtering.
- [#3233](https://github.com/Azure/typespec-azure/pull/3233) Allow `@alternateType` to reference external types as well

### Bug Fixes

- [#3353](https://github.com/Azure/typespec-azure/pull/3353) Handle wrong `api-version` config.
- [#3285](https://github.com/Azure/typespec-azure/pull/3285) Fix missing doc for nullable type.
- [#3324](https://github.com/Azure/typespec-azure/pull/3324) Refine error message for `@override`.
- [#3266](https://github.com/Azure/typespec-azure/pull/3266) Cleanup usage of legacy Azure.Core paging apis
- [#3361](https://github.com/Azure/typespec-azure/pull/3361) Fix bug ignoring `@clientName` decorator when applied to `@client` clients
- [#3311](https://github.com/Azure/typespec-azure/pull/3311) Fix missing example for operation directly extends from templated interface.


## 0.60.3

### Bug Fixes

- [#3328](https://github.com/Azure/typespec-azure/pull/3328) Fix propagation of client initialization parameters set on parent clients
- [#3327](https://github.com/Azure/typespec-azure/pull/3327) Allow `@markAsLro` to work with union return types


## 0.60.2

### Bug Fixes

- [#3300](https://github.com/Azure/typespec-azure/pull/3300) add `@Azure.ClientGenerator.Core.Legacy.markAsLro` for legacy brownfield services that need to mark non-lro methods as lro


## 0.60.1

### Bug Fixes

- [#3293](https://github.com/Azure/typespec-azure/pull/3293) Allow `@alternateType` to reference external types as well


## 0.60.0

### Breaking Changes

- [#3202](https://github.com/Azure/typespec-azure/pull/3202) Move deprecated `@flattenProperty` decorator into the `Azure.ClientGenerator.Core.Legacy` namespace
- [#3189](https://github.com/Azure/typespec-azure/pull/3189) Compare type when map body parameter to method parameter. This is a behavior breaking change. The Http parameter's corresponding parameter may change.

### Features

- [#3223](https://github.com/Azure/typespec-azure/pull/3223) add `.decorators` property to `SdkNamespace` type that will display decorators listed in the allowed list
- [#2980](https://github.com/Azure/typespec-azure/pull/2980) Add support for `@clientLocation` to apply to parameters.
- [#3199](https://github.com/Azure/typespec-azure/pull/3199) Add `.pageSizeParameterSegments` to `.pagingMetadata` on paging methods to return the path to the page size parameter

### Bump dependencies

- [#3207](https://github.com/Azure/typespec-azure/pull/3207) Upgrade dependencies

### Bug Fixes

- [#3232](https://github.com/Azure/typespec-azure/pull/3232) Add warning for `@clientName` that is applied to override methods bc they're ineffectual
- [#3208](https://github.com/Azure/typespec-azure/pull/3208) Return union of response types with warning instead of silently selecting the first one


## 0.59.1

### Bug Fixes

- [#3160](https://github.com/Azure/typespec-azure/pull/3160) Consider inheritance when mapping first segment for paging result.


## 0.59.0

No changes, version bump only.

## 0.58.2

### Features

- [#3093](https://github.com/Azure/typespec-azure/pull/3093) Report warning for operations with same name when using `@clientName` for .NET.

### Bug Fixes

- [#3107](https://github.com/Azure/typespec-azure/pull/3107) Support multipart response and fix multipart anonymous model naming empty.
- [#3120](https://github.com/Azure/typespec-azure/pull/3120) Fix next link re-injection segments missing problem after migrating to unbranded pagination.


## 0.58.1

### Bump dependencies

- [#3029](https://github.com/Azure/typespec-azure/pull/3029) Upgrade dependencies

### Bug Fixes

- [#3051](https://github.com/Azure/typespec-azure/pull/3051) Do not add accept header if only error response has body.
- [#3053](https://github.com/Azure/typespec-azure/pull/3053) Accept string value examples for number/boolean types
- [#3004](https://github.com/Azure/typespec-azure/pull/3004) Fix typing inconsistent when using `@alternateType` along with `@override`.
- [#3012](https://github.com/Azure/typespec-azure/pull/3012) Replace the property type of a multipart model with the real body type for the HTTP part. Put all other info into the property's multipart serialization option with `MultipartOptions` type. Add `headers` property with `SdkHeaderParameter[]` type in `MultipartOptions` interface.
- [#3063](https://github.com/Azure/typespec-azure/pull/3063) Find the correct first segment before doing page segments mapping.
- [#2817](https://github.com/Azure/typespec-azure/pull/2817) Removed type alias: `SdkModelPropertyType` and `SdkParameter`. For the place that used these two aliases, changed to more explicit type, e.g., for the property of `SdkModelType`, the type now is `SdkModelPropertyType` only. Since current model property will never be `SdkHttpParameter`, emitter could not filter them out from a model. Use `isHttpMetadata` instead.
- [#3000](https://github.com/Azure/typespec-azure/pull/3000) Fix relative import from `typespec-azure-core`
- [#3031](https://github.com/Azure/typespec-azure/pull/3031) Add `@hierarchyBuilding` decorator for legacy backcompat multi-level discriminator handling.


## 0.58.0

### Bug Fixes

- [#2984](https://github.com/Azure/typespec-azure/pull/2984) Fix wrong API version elevator logic with `@clientLocation`.


## 0.57.3

### Bump dependencies

- [#2867](https://github.com/Azure/typespec-azure/pull/2867) Upgrade dependencies

### Bug Fixes

- [#2859](https://github.com/Azure/typespec-azure/pull/2859) Add support for other lro metadata


## 0.57.2

### Features

- [#2890](https://github.com/Azure/typespec-azure/pull/2890) Support load examples in nested folders.

### Bump dependencies

- [#2867](https://github.com/Azure/typespec-azure/pull/2867) Upgrade dependencies

### Bug Fixes

- [#2889](https://github.com/Azure/typespec-azure/pull/2889) Consider `@clientLocation` when validate client name collision.
- [#2871](https://github.com/Azure/typespec-azure/pull/2871) Fix scope calculation logic.
- [#2861](https://github.com/Azure/typespec-azure/pull/2861) Fix `disableUsageAccessPropagationToBase` issue for discriminated model.


## 0.57.1

### Bug Fixes

- [#2785](https://github.com/Azure/typespec-azure/pull/2785) Add `@clientLocation` decorator to support moving an operation to another client or sub-client.
- [#2841](https://github.com/Azure/typespec-azure/pull/2841) Fix operations missing problem after introducing `@clientLocation`.
- [#2815](https://github.com/Azure/typespec-azure/pull/2815) Extend `@usage` to accept `json` and `xml` usage. `@usage` now is used to add usage for type and namespace, instead of override the usage calculated by operation. Also, the serialization options will include JSON or XML info if new usage is added.


## 0.57.0

No changes, version bump only.

## 0.56.4

### Bug Fixes

- [#2796](https://github.com/Azure/typespec-azure/pull/2796) Ignore empty `{}` definitions from `no-unnamed-types` rule


## 0.56.3

### Bump dependencies

- [#2667](https://github.com/Azure/typespec-azure/pull/2667) Upgrade dependencies

### Bug Fixes

- [#2750](https://github.com/Azure/typespec-azure/pull/2750) Refine API version parameter judgement with checking the service's API version enum.
- [#2755](https://github.com/Azure/typespec-azure/pull/2755) Fix `no-unnamed-types` linter warning not being applied to versioned namespaces
- [#2755](https://github.com/Azure/typespec-azure/pull/2755) Fix linter perf for `@azure-tools/typespec-client-generator-core` linter warnings
- [#2770](https://github.com/Azure/typespec-azure/pull/2770) Don't raise `no-unnamed-types` for nullable types
- [#2690](https://github.com/Azure/typespec-azure/pull/2690) loosen requirements to link method to service params
- [#2707](https://github.com/Azure/typespec-azure/pull/2707) Fix documentation on generate-convenience-methods option.


## 0.56.2

### Bug Fixes

- [#2658](https://github.com/Azure/typespec-azure/pull/2658) Add fallback logic for example mapping of discriminated type.
- [#2651](https://github.com/Azure/typespec-azure/pull/2651) Use client name for body mapping as fall back logic.
- [#2651](https://github.com/Azure/typespec-azure/pull/2651) Fix wrong cache logic for array or dictionary with self referenced value type.
- [#2663](https://github.com/Azure/typespec-azure/pull/2663) Add linter warning against multiple param aliases for the same parameter
- [#2665](https://github.com/Azure/typespec-azure/pull/2665) Fix error thrown when removing optional query parameters from method signature with the `@override` decorator
- [#2666](https://github.com/Azure/typespec-azure/pull/2666) Check root source property to determine if two properties are the same


## 0.56.1

### Features

- [#2592](https://github.com/Azure/typespec-azure/pull/2592) Change default value of initializedBy for SdkOperationGroup from `InitializedByFlags.Parent` to `InitializedByFlags.Default`

### Bug Fixes

- [#2626](https://github.com/Azure/typespec-azure/pull/2626) Convert to same type for array or dictionary of same type.


## 0.56.0

### Features

- [#2562](https://github.com/Azure/typespec-azure/pull/2562) Add `metadata` property to `SdkPackage` type to export package related info.

### Bug Fixes

- [#2562](https://github.com/Azure/typespec-azure/pull/2562) Support `null` example value for `unknown` type.
- [#2584](https://github.com/Azure/typespec-azure/pull/2584) Loosen requirements for parameters in `@override` so they don't have to be exactly the same node


## 0.55.1

### Bug Fixes

- [#2591](https://github.com/Azure/typespec-azure/pull/2591) Update source property checks to look at node


## 0.55.0

No changes, version bump only.

## 0.54.2

### Bug Fixes

- [#2556](https://github.com/Azure/typespec-azure/pull/2556) Make spread body parameter always be required.
- [#2552](https://github.com/Azure/typespec-azure/pull/2552) Fix algorithm problem when omitting optional parameter with `@override`.


## 0.54.1

### Features

- [#2523](https://github.com/Azure/typespec-azure/pull/2523) Add `@clientDoc` decorator
- [#2483](https://github.com/Azure/typespec-azure/pull/2483) Add linter rule `no-unnamed-types` to warn against generated anonymous types
- [#2486](https://github.com/Azure/typespec-azure/pull/2486) Extend supported alternate type for decorator `@alternateType`

### Bug Fixes

- [#2479](https://github.com/Azure/typespec-azure/pull/2479) Filter out model-only clients
- [#2526](https://github.com/Azure/typespec-azure/pull/2526) Always ignore `null` example value for non-nullable type.
- [#2510](https://github.com/Azure/typespec-azure/pull/2510) Fix setting of `@clientNamespace` when it is overridden in the namespace path
- [#2520](https://github.com/Azure/typespec-azure/pull/2520) Fix path and body optionality value to allow them to be optional.


## 0.54.0

### Breaking Changes

- [#2466](https://github.com/Azure/typespec-azure/pull/2466) Reorder clients, enums, models and unions.
- [#2456](https://github.com/Azure/typespec-azure/pull/2456) Remove deprecated staffs:
  1. `UsageFlags.Error` -> `UsageFlags.Exception`
  2. `SdkClientType.initialization` -> `SdkClientType.clientInitialization.paramters`
  3. `SdkPathParameter.urlEncode` -> `SdkPathParameter.allowReserved`
  4. `SdkClientAccessor` -> `SdkClientType.parent`/`SdkClientType.children`
  5. `SdkExampleBase.description` -> `SdkExampleBase.doc`
- [#2447](https://github.com/Azure/typespec-azure/pull/2447) Split emitter options into `UnbrandedSdkEmitterOptions` and `BrandedSdkEmitterOptions`. Each flag will be exported individually, so emitters can choose which flags to support
- [#2421](https://github.com/Azure/typespec-azure/pull/2421) Removed `package-name` and `flatten-union-as-enum` from `SdkEmitterOptions`, `clientNamespace` from `SdkClientType`/`SdkNullableType`/`SdkEnumType`/`SdkUnionType`/`SdkModelType`, `packageName` from `TCGCContext`, `nameSpace` from `SdkClientType`, `name`/`rootNamespace` from `SdkPackage` and `getClientNamespaceString` function. All these things should have been deprecated in previous version or not used by any emitters.

### Features

- [#2466](https://github.com/Azure/typespec-azure/pull/2466) Report warning for multiple `@service` and fall back to the first one.
- [#2441](https://github.com/Azure/typespec-azure/pull/2441) add `@deserializeEmptyStringAsNull` decorator
- [#2368](https://github.com/Azure/typespec-azure/pull/2368) Add `@clientApiVersions` decorator to specify all API versions you would like to expose in the client API versions enum.
- [#2416](https://github.com/Azure/typespec-azure/pull/2416) Simplely handle duplication for template instance.
- [#2412](https://github.com/Azure/typespec-azure/pull/2412) Support re-injected query parameter for next link.
- [#2414](https://github.com/Azure/typespec-azure/pull/2414) Remove support for old multipart format
- [#2469](https://github.com/Azure/typespec-azure/pull/2469) add `@responseAsBool` decorator
- [#2428](https://github.com/Azure/typespec-azure/pull/2428) Add support for new core HTTP bodyKind: "file".

### Bump dependencies

- [#2433](https://github.com/Azure/typespec-azure/pull/2433) Upgrade dependencies

### Bug Fixes

- [#2480](https://github.com/Azure/typespec-azure/pull/2480) Consider method parameter model when generating name for anonymous model.
- [#2439](https://github.com/Azure/typespec-azure/pull/2439) Resolve generated name for anonymous model conflict with user-defined type name.
- [#2471](https://github.com/Azure/typespec-azure/pull/2471) Change diagnostic target for `no-corresponding-method-param` error.
- [#2471](https://github.com/Azure/typespec-azure/pull/2471) Change default endpoint's type to `url` and `allowReserved` to `true`.
- [#2436](https://github.com/Azure/typespec-azure/pull/2436) Remove duplicate line for build-in license info.
- [#2411](https://github.com/Azure/typespec-azure/pull/2411) Do not add encode for bytes according to content type if it has user defined encode.
- [#2452](https://github.com/Azure/typespec-azure/pull/2452) Downgrade override params mismatch to a warning instead of an error
- [#2421](https://github.com/Azure/typespec-azure/pull/2421) Rollback change of `SdkApiVersionParameter`.


## 0.53.1

### Bug Fixes

- [#2425](https://github.com/Azure/typespec-azure/pull/2425) Rollback change of `SdkApiVersionParameter`.
- [#2425](https://github.com/Azure/typespec-azure/pull/2425) Removed `package-name` and `flatten-union-as-enum` from `SdkEmitterOptions`, `clientNamespace` from `SdkClientType`/`SdkNullableType`/`SdkEnumType`/`SdkUnionType`/`SdkModelType`, `packageName` from `TCGCContext`, `nameSpace` from `SdkClientType`, `name`/`rootNamespace` from `SdkPackage` and `getClientNamespaceString` function. All these things should have been deprecated in previous version or not used by any emitters.


## 0.53.0

### Breaking Changes

- [#2309](https://github.com/Azure/typespec-azure/pull/2309) Minimum node version is now 20

### Deprecations

- [#2344](https://github.com/Azure/typespec-azure/pull/2344) Remove unused public `listSubClients` to avoid confusion with new internal utils function
- [#2216](https://github.com/Azure/typespec-azure/pull/2216) Deprecate `packageName` in `TCGCContext`. Use `namespaceFlag` instead.
- [#2216](https://github.com/Azure/typespec-azure/pull/2216) Remove support for deprecated `examples-directory`

### Features

- [#2298](https://github.com/Azure/typespec-azure/pull/2298) Add `pageItemsSegments` for `SdkPagingServiceMetadata` to indicate how to get page items from response.
- [#2390](https://github.com/Azure/typespec-azure/pull/2390) Specific scope decorator should always override all-scopes decorator.
- [#2377](https://github.com/Azure/typespec-azure/pull/2377) Report diagnostic errors for discriminated unions.
- [#2378](https://github.com/Azure/typespec-azure/pull/2378) Output auth related info in the yaml of code model.
- [#2373](https://github.com/Azure/typespec-azure/pull/2373) Provide `listAllServiceNamespaces` to list service namespaces with versioning support.
- [#2393](https://github.com/Azure/typespec-azure/pull/2393) Export `SdkEmitterOptionsSchema` for downstream emitter to add same options.
- [#2353](https://github.com/Azure/typespec-azure/pull/2353) Add `licenseInfo` property of `LicenseInfo` type to `SdkPackage`, which is used to indicate the license for the package and could be configured by `license.name`, `license.company`, `license.link`, `license.header` and `license.description` in `tspconfig.yaml`.
- [#2319](https://github.com/Azure/typespec-azure/pull/2319) Map all streaming request and response type to bytes.
- [#2372](https://github.com/Azure/typespec-azure/pull/2372) Extend `@access` to also apply to `ModelProperty`s.
- [#2326](https://github.com/Azure/typespec-azure/pull/2326) Add `namespace` flag to tcgc.
- [#2216](https://github.com/Azure/typespec-azure/pull/2216) Refine all tcgc flags. Deprecate `flatten-union-as-enum` flag in `tspconfig.yaml`, and switch it to `flattenUnionAsEnum` in `CreateSdkContextOptions`.
- [#2305](https://github.com/Azure/typespec-azure/pull/2305) Move from projections to mutators.
- [#1208](https://github.com/Azure/typespec-azure/pull/1208) Add linter rulesets to TCGC, for both generic and language-specific linter rules.

### Bump dependencies

- [#2308](https://github.com/Azure/typespec-azure/pull/2308) Update dependencies

### Bug Fixes

- [#2298](https://github.com/Azure/typespec-azure/pull/2298) Keep empty for `serializedName` if the body parmeter is not explicitly defined.
- [#2319](https://github.com/Azure/typespec-azure/pull/2319) Consider extensible enum when doing example value mapping.
- [#2319](https://github.com/Azure/typespec-azure/pull/2319) Do not consider template type when calculating discriminator and orphan types.
- [#2351](https://github.com/Azure/typespec-azure/pull/2351) Support `@nextLink` along with `@header`.
- [#2152](https://github.com/Azure/typespec-azure/pull/2152) move from `isApiVersionParam` -> SdkApiVersionType
- [#2222](https://github.com/Azure/typespec-azure/pull/2222) Recurse over namespaces to get all user defined namespaces"
- [#2344](https://github.com/Azure/typespec-azure/pull/2344) Set `.clientDefaultValue` for api-versions in triple-nested clients
- [#2356](https://github.com/Azure/typespec-azure/pull/2356) Fix setting of api versions to ensure we aren't dropping versions throughout building up our api version graph
- [#2402](https://github.com/Azure/typespec-azure/pull/2402) Ignore visibility when finding HTTP response type if it is anonymous model.
- [#2357](https://github.com/Azure/typespec-azure/pull/2357) Cleanup use of typespec compiler internal apis.


## 0.52.0

### Features

- [#2257](https://github.com/Azure/typespec-azure/pull/2257) Adds support for `@header` explode field
- [#2263](https://github.com/Azure/typespec-azure/pull/2263) Update azure core libraries to use Enum-based visibility modifiers instead of strings.

### Bug Fixes

- [#2208](https://github.com/Azure/typespec-azure/pull/2208) Make sure to keep orphan models


## 0.51.3

### Bug Fixes

- [#2252](https://github.com/Azure/typespec-azure/pull/2252) `isGeneratedName` always set to true only when it is the inner type of nullable union.
- [#2252](https://github.com/Azure/typespec-azure/pull/2252) Remove parameter cache to retain HTTP metadata info for model property.


## 0.51.2

### Bug Fixes

- [#2229](https://github.com/Azure/typespec-azure/pull/2229) Fix missing result segments of anonymous paged response with header.
- [#2196](https://github.com/Azure/typespec-azure/pull/2196) Do not allow union with circular ref, change union name inside nullable type and do not take nullable type as non-body response.

### Features

- [#2206](https://github.com/Azure/typespec-azure/pull/2206) Add `pagingMetadata.continuationTokenParameterSegments` and `pagingMetadata.continuationTokenResponseSegments` to `SdkPagingServiceMetadata` to indicate the mapping of continuation token parameter and response.
- [#2206](https://github.com/Azure/typespec-azure/pull/2206) Make `SdkServiceResponseHeader` to be part of `SdkModelPropertyType`. Then it could contain the client related info.
- [#2206](https://github.com/Azure/typespec-azure/pull/2206) Add `SdkPagingServiceMetadata` type to store all paging related info.
- [#2220](https://github.com/Azure/typespec-azure/pull/2220) Add `crossLanguageDefinitionId` property for `SdkNullableType`.

### Deprecations

- [#2206](https://github.com/Azure/typespec-azure/pull/2206) Deprecate `__raw_paged_metadata`, `nextLinkPath` and `nextLinkOperation`  in `SdkPagingServiceMethodOptions`. Use `pagingMetadata.__raw`, `pagingMetadata.nextLinkSegments` and `pagingMetadata.nextLinkOperation` instead.
- [#2206](https://github.com/Azure/typespec-azure/pull/2206) Deprecate `resultPath` in `SdkMethodResponse`. Use `resultSegments` instead.
- [#2219](https://github.com/Azure/typespec-azure/pull/2219) Deprecate `clientNamespace` property in `SdkClientType`, `SdkNullableType`, `SdkEnumType`, `SdkUnionType` and `SdkModelType`. Use `namespace` instead.

### Breaking Changes

- [#2217](https://github.com/Azure/typespec-azure/pull/2217) Remove `null` form union for `value` property type of `SdkConstantType`. It is a breaking change, but since no logic will come to `null` type, it shall have little impact.


## 0.51.1

### Bug Fixes

- [#2211](https://github.com/Azure/typespec-azure/pull/2211) Make sure to keep orphan models


## 0.51.0

### Bug Fixes

- [#2176](https://github.com/Azure/typespec-azure/pull/2176) Enhance content type judge logic, which fix missing serialization options of models and wrong bytes encode.
- [#2181](https://github.com/Azure/typespec-azure/pull/2181) Fix wrong example doc of `@override` decorator.
- [#2167](https://github.com/Azure/typespec-azure/pull/2167) add cache for `SdkModelPropertyType` in TCGCContext
- [#2172](https://github.com/Azure/typespec-azure/pull/2172) move to core's `getVisibilityForClass` to determine a property's visibility
- [#2159](https://github.com/Azure/typespec-azure/pull/2159) add `.json` serialization information for json model serialization within multipart
- [#2163](https://github.com/Azure/typespec-azure/pull/2163) add visibility for other properties

### Bump dependencies

- [#2109](https://github.com/Azure/typespec-azure/pull/2109) Upgrade dependencies

### Features

- [#2102](https://github.com/Azure/typespec-azure/pull/2102) Add a `resultSegments` property to `SdkLroServiceFinalResponse` and deprecate `resultPath` property. Add a `resultSegments` property to `SdkMethodResponse`.
- [#2179](https://github.com/Azure/typespec-azure/pull/2179) add support for models-only packages


## 0.50.3

### Bug Fixes

- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Change `@clientInitialization` decorator's `options` parameter to `ClientInitializationOptions` type. The options now could set how to initialize the client. Though the implementation could support backward compatibility, it's better to have all specs that use this decorator change from `@clientInitialization(CustomizedOption)` to `@clientInitialization({parameters: CustomizedOption})`. A new helper `getClientInitializationOptions` is added for getting the new `ClientInitializationOptions` info from the `@clientInitialization` decorator.
- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Add new `children` property to `SdkClientType` to include all the sub client belong to that client.
- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Add `clientInitialization` property to `SdkClientType`. Its type is `SdkClientInitializationType` which includes the initialization parameters and how to initialize the client.
- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Deprecate `initialization` property of `SdkClientType`. Use `init.paramters` of `SdkClientType` instead.
- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Deprecate `SdkClientAccessor` type. Use `parent` and `children` property from `SdkClientType` to find client hierarchy instead.


## 0.50.2

### Bug Fixes

- [#2115](https://github.com/Azure/typespec-azure/pull/2115) Fix regression of example mapping for model with parameters.

### Deprecations

- [#2115](https://github.com/Azure/typespec-azure/pull/2115) Deprecate `serializedName` property of `SdkEndpointParameter`. Use `type.templateArguments[x].serializedName` or `type.variantTypes[x].templateArguments[x].serializedName` instead.


## 0.50.1

### Features

- [#2097](https://github.com/Azure/typespec-azure/pull/2097) support `name` and `isGeneratedName` for nullable type
- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Add `serializationOptions` property to `SdkModelType` and `SdkBodyModelPropertyType`. Its type is `SerializationOptions` which contains the info of how to serialize to Json/Xml/Multipart value.

### Deprecations

- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Deprecate `serializedName` property in `SdkBodyModelPropertyType`, use `serializationOptions.xxx.name` instead.
- [#2027](https://github.com/Azure/typespec-azure/pull/2027) Deprecate `multipartOptions` in `SdkBodyModelPropertyType`, use `serializationOptions.multipart` instead.


## 0.50.0

### Features

- [#1998](https://github.com/Azure/typespec-azure/pull/1998) Add `@scope` decorator to define the language scope for operation
- [#2029](https://github.com/Azure/typespec-azure/pull/2029) add `@alternateType` decorator


## 0.49.1

### Bug Fixes

- [#2000](https://github.com/Azure/typespec-azure/pull/2000) ensure operation examples to be ordered
- [#2004](https://github.com/Azure/typespec-azure/pull/2004) get correct pageable info for azure pageable operation with inheritance return model
- [#2034](https://github.com/Azure/typespec-azure/pull/2034) refine cross language definition id logic

### Features

- [#2010](https://github.com/Azure/typespec-azure/pull/2010) add `getHttpOperationParameter` helper function
- [#1978](https://github.com/Azure/typespec-azure/pull/1978) Add `@apiVersion` decorator to override whether a parameter is an api version or not

### Breaking Changes

- [#2007](https://github.com/Azure/typespec-azure/pull/2007) fix typo of `crossLanguageDefinitionId` of method.


## 0.49.0

### Bug Fixes

- [#1950](https://github.com/Azure/typespec-azure/pull/1950) Update lockfile for core changes

### Features

- [#1812](https://github.com/Azure/typespec-azure/pull/1812) add `SdkCookieParameter` type and support `@cookie` in TypeSpec http lib
- [#1783](https://github.com/Azure/typespec-azure/pull/1783) Implement scope negation for TCGC decorators
- [#1912](https://github.com/Azure/typespec-azure/pull/1912) support emit code model


## 0.48.6

### Bug Fixes

- [#1966](https://github.com/Azure/typespec-azure/pull/1966) Allow for responses without bodies to be errors, depending on presence of `@error` decorator


## 0.48.5

### Breaking Changes

- [#1957](https://github.com/Azure/typespec-azure/pull/1957) Introduce new usage: `LroInitial`, `LroPolling`, `LroFinalEnvelope`. Usage and access now properly propagate on polling model, final result and final envelop result of `lroMetadata`.


## 0.48.4

### Bug Fixes

- [#1935](https://github.com/Azure/typespec-azure/pull/1935) fix wrong `unexpected-pageable-operation-return-type` because of nullable type


## 0.48.3

### Bug Fixes

- [#1907](https://github.com/Azure/typespec-azure/pull/1907) use the right path parameter name when filtering method parameter

### Features

- [#1919](https://github.com/Azure/typespec-azure/pull/1919) support typespec common paging
- [#1918](https://github.com/Azure/typespec-azure/pull/1918) remove none visibility property for model


## 0.48.2

### Bug Fixes

- [#1858](https://github.com/Azure/typespec-azure/pull/1858) do not replace operation with `@override` when `listOperationsInOperationGroup`
- [#1833](https://github.com/Azure/typespec-azure/pull/1833) do not add protocol usage for protocol method's response type

### Features

- [#1835](https://github.com/Azure/typespec-azure/pull/1835) add `isPagedResultModel` helper function
- [#1834](https://github.com/Azure/typespec-azure/pull/1834) add `disableUsageAccessPropagationToBase` to support language that does not generate base model
- [#1858](https://github.com/Azure/typespec-azure/pull/1858) add `isOverride` flag to `SdkServiceMethod`.

### Breaking Changes

- [#1854](https://github.com/Azure/typespec-azure/pull/1854) deprecate `Error` usage and add `Exception` usage. for all models used in exception response, they will no longer have `Output` usage, but have `Exception` usage.


## 0.48.1

### Bug Fixes

- [#1813](https://github.com/Azure/typespec-azure/pull/1813) fix wrong encode for body response of binary type
- [#1786](https://github.com/Azure/typespec-azure/pull/1786) support client namespace


## 0.48.0

### Bug Fixes

- [#1806](https://github.com/Azure/typespec-azure/pull/1806) remove filtering core model flag

### Bump dependencies

- [#1663](https://github.com/Azure/typespec-azure/pull/1663) Upgrade dependencies


## 0.47.4

### Bug Fixes

- [#1763](https://github.com/Azure/typespec-azure/pull/1763) support serialized name for body parameter to avoid example mis-mapping
- [#1761](https://github.com/Azure/typespec-azure/pull/1761) use root source property to map operation params to method
- [#1775](https://github.com/Azure/typespec-azure/pull/1775) remove unused path parameter from method
- [#1700](https://github.com/Azure/typespec-azure/pull/1700) We no longer filter out core models. The `filter-out-core-models` parameter to `SdkContext` is also removed
- [#1772](https://github.com/Azure/typespec-azure/pull/1772) use array instead of set to make the types ordered by typespec definition
- [#1762](https://github.com/Azure/typespec-azure/pull/1762) make union/nullable type to be reference type and add usage/access support for them


## 0.47.3

### Bug Fixes

- [#1731](https://github.com/Azure/typespec-azure/pull/1731) fix wrong compare target for response body with anonymous model when finding anonymous model context
- [#1698](https://github.com/Azure/typespec-azure/pull/1698) have paging respect renames


## 0.47.2

### Bug Fixes

- [#1606](https://github.com/Azure/typespec-azure/pull/1606) overwrite original value when set multiple value for same decorator


## 0.47.1

### Bug Fixes

- [#1659](https://github.com/Azure/typespec-azure/pull/1659) remove projection for source model since typespec core has already fixed the issue


## 0.47.0

### Bug Fixes

- [#1511](https://github.com/Azure/typespec-azure/pull/1511) Fix logic to check conflicting usage for model of multipart body and regular body
- [#1629](https://github.com/Azure/typespec-azure/pull/1629) do not promote api version param to client if service is not versioned
- [#1630](https://github.com/Azure/typespec-azure/pull/1630) do not override client default value for api version param in non-versioning service
- [#1607](https://github.com/Azure/typespec-azure/pull/1607) set service of og in using time instead of setting time

### Bump dependencies

- [#1534](https://github.com/Azure/typespec-azure/pull/1534) Bump dependencies

### Features

- [#1631](https://github.com/Azure/typespec-azure/pull/1631) support value type for client default value
- [#1515](https://github.com/Azure/typespec-azure/pull/1515) add `SdkLroServiceMetadata`

### Deprecations

- [#1613](https://github.com/Azure/typespec-azure/pull/1613) deprecate description in `SdkExampleBase`

### Breaking Changes

- [#1560](https://github.com/Azure/typespec-azure/pull/1560) Remove `.description` and `.details` from deprecated api surface


## 0.46.2

### Bug Fixes

- [#1592](https://github.com/Azure/typespec-azure/pull/1592) change example mapping logic to allow operation id with/without renaming
- [#1589](https://github.com/Azure/typespec-azure/pull/1589) In `0.46.1` we changed the type of `responses` in `SdkHttpOperation` from `Map<number | HttpRange, SdkHttpResponse>` to `SdkHttpResponse[]`, `exceptions` in `SdkHttpOperation` from `Map<number | HttpRange | "*", SdkHttpResponse>` to `SdkHttpResponse[]`,
and added a `statusCodes` property to `SdkHttpResponse`. But the `statusCodes` is defined as `number | HttpRange | "*"`, which loses the information that the responses in `responses` property could never have a `*` as its statusCodes.
This PR adds a new type `SdkHttpErrorResponse` with the `statusCodes` of `number | HttpRange | "*"`, and changes the type of `statusCodes` in `SdkHttpResponse` to `number | HttpRange` to be precise.


## 0.46.1

### Bug Fixes

- [#1491](https://github.com/Azure/typespec-azure/pull/1491) Fix naming logic for anonymous model wrapped by `HttpPart`
- [#1542](https://github.com/Azure/typespec-azure/pull/1542) Fix `subscriptionId` for ARM SDK
- [#1558](https://github.com/Azure/typespec-azure/pull/1558) Handle orphan types in nested namespaces
- [#1554](https://github.com/Azure/typespec-azure/pull/1554) Fix `onClient` setting for client initialization parameters applied to an interface

### Breaking Changes

- [#1540](https://github.com/Azure/typespec-azure/pull/1540)
  1. The type of `responses` and `exceptions` in `SdkHttpOperation` changed from `Map<number | HttpStatusCodeRange | "*", SdkHttpResponse>` to `SdkHttpResponse[]`.
  2. The type of `responses` in `SdkHttpOperationExample` changed from `Map<number, SdkHttpResponseExampleValue>` to `SdkHttpResponseExampleValue[]`.
  3. `SdkHttpResponse` adds a new property `statusCodes` to store its corresponding status code or status code range.
  Migration hints:
  The type changed from map to array, and the key of the map is moved as a new property of the value type. For example, for code like this:
  ```
  for (const [statusCodes, response] of operation.responses)
  ```
  you could do the same in this way:
  ```
  for (const response of operation.responses)
  {
    const statusCodes = response.statusCodes;
  }
  ```
- [#1463](https://github.com/Azure/typespec-azure/pull/1463)
  1. The kind for `unknown` renamed from `any` to `unknown`.
  2. The `values` property in `SdkUnionType` renamed to `variantTypes`.
  3. The `values` property in `SdkTupleType` renamed to `valueTypes`.
  4. The example types for parameter, response and `SdkType` has been renamed to `XXXExampleValue` to emphasize that they are values instead of the example itself.
  5. The `@format` decorator is no longer able to change the type of the property.
- [#1539](https://github.com/Azure/typespec-azure/pull/1539)
  1. change `encode` in `SdkBuiltInType` to optional.
  2. no longer use the value of `kind` as `encode` when there is no encode on this type.
- [#1541](https://github.com/Azure/typespec-azure/pull/1541) no longer export the `SdkExampleValueBase` interface. This type should have no usage in downstream consumer's code. If there is any usage, please replace it with `SdkExampleValue`.


## 0.46.0

### Bug Fixes

- [#1476](https://github.com/Azure/typespec-azure/pull/1476) Fix to add client signature `subscriptionId` for ARM SDK
- [#1424](https://github.com/Azure/typespec-azure/pull/1424) do not handle example value with null for model type
- [#1424](https://github.com/Azure/typespec-azure/pull/1424) consider renaming for parameter or property
- [#1431](https://github.com/Azure/typespec-azure/pull/1431) consider renaming when mapping examples
- [#1452](https://github.com/Azure/typespec-azure/pull/1452) TCGC, make content type optional when request body is optional
- [#1399](https://github.com/Azure/typespec-azure/pull/1399) remove import of `UnionEnumVariant`
- [#1432](https://github.com/Azure/typespec-azure/pull/1432) need to handle projection when finding spread original model
- [#1377](https://github.com/Azure/typespec-azure/pull/1377) Fix getLibraryName for anonymous model which is derived from template
- [#1435](https://github.com/Azure/typespec-azure/pull/1435) Don't require params introduced by `Azure.Core` with `@override`
- [#1410](https://github.com/Azure/typespec-azure/pull/1410) set sdk method body parameter encode with http content type

### Features

- [#1305](https://github.com/Azure/typespec-azure/pull/1305) Add Namespace as target for @access decorator
- [#1398](https://github.com/Azure/typespec-azure/pull/1398) add `@clientInitialization` decorator
- [#1253](https://github.com/Azure/typespec-azure/pull/1253) add parent client info to `SdkClientType`
- [#1253](https://github.com/Azure/typespec-azure/pull/1253) add `listSubClients` helper func
- [#1379](https://github.com/Azure/typespec-azure/pull/1379) add `doc` and `summary` to tcgc types
- [#1387](https://github.com/Azure/typespec-azure/pull/1387) add default path for example detection
- [#1395](https://github.com/Azure/typespec-azure/pull/1395) do propagation when override access or usage
- [#1388](https://github.com/Azure/typespec-azure/pull/1388) use original model for spread if it is from a simple spread
- [#1303](https://github.com/Azure/typespec-azure/pull/1303) allow `@usage` to apply to namespaces

### Deprecations

- [#1395](https://github.com/Azure/typespec-azure/pull/1395) deprecate `@internal` decorator and `isInternal` helper function

### Breaking Changes

- [#1440](https://github.com/Azure/typespec-azure/pull/1440) Filter Core models directly instead of clear their usage
- [#1451](https://github.com/Azure/typespec-azure/pull/1451) Have no client parameters appear on method signatures
- [#1420](https://github.com/Azure/typespec-azure/pull/1420) clean up deprecation exports of previous version


## 0.45.4

### Bug Fixes

- [#1392](https://github.com/Azure/typespec-azure/pull/1392) Fix multipart for client customization


## 0.45.3

### Bug Fixes

- [#1328](https://github.com/Azure/typespec-azure/pull/1328) change example file path to relative file path
- [#1338](https://github.com/Azure/typespec-azure/pull/1338) consider scope when find service of a client
- [#1376](https://github.com/Azure/typespec-azure/pull/1376) no need to add access override along with usage override for orphan model

### Features

- [#1363](https://github.com/Azure/typespec-azure/pull/1363) URI template support


## 0.45.2

### Bug Fixes

- [#1336](https://github.com/Azure/typespec-azure/pull/1336) Add `@hasJsonConverter` for csharp only to indicate if JSON converter is needed
- [#1350](https://github.com/Azure/typespec-azure/pull/1350) Bug fix for encode as string on ModelProperty.
- [#1343](https://github.com/Azure/typespec-azure/pull/1343) Add generic parameter inputs to `SdkUnionType` to clearly define the union types of `endpoint` and `credential` params


## 0.45.1

### Bug Fixes

- [#1330](https://github.com/Azure/typespec-azure/pull/1330) Fix collectionFormat for "csv"


## 0.45.0

### Bug Fixes

- [#1238](https://github.com/Azure/typespec-azure/pull/1238) TCGC, add `crossLanguageDefinitionId` to `SdkClientType`
- [#1266](https://github.com/Azure/typespec-azure/pull/1266) expose default values for endpoint template arguments through `.clientDefaultValue`
- [#1281](https://github.com/Azure/typespec-azure/pull/1281) Support @multipartBody for `bodyParam` of `SdkHttpOperation`
- [#1233](https://github.com/Azure/typespec-azure/pull/1233) don't move server description onto endpoints parameter

### Bump dependencies

- [#1219](https://github.com/Azure/typespec-azure/pull/1219) Update dependencies

### Features

- [#1258](https://github.com/Azure/typespec-azure/pull/1258) add support for encoding an int as a string
- [#1155](https://github.com/Azure/typespec-azure/pull/1155) Make literal endpoints overridable
- [#1148](https://github.com/Azure/typespec-azure/pull/1148) add `@override` decorator that allows authors to explicitly describe their desired client method


## 0.44.3

### Bug Fixes

- [#1244](https://github.com/Azure/typespec-azure/pull/1244) The baseType will be undefined if the `SdkBuiltInType`, `SdkDateTimeType`, `SdkDurationType` is a std type
- [#1251](https://github.com/Azure/typespec-azure/pull/1251) Change output for `HttpPart<T>[]`


## 0.44.2

### Bug Fixes

- [#1231](https://github.com/Azure/typespec-azure/pull/1231) Fix the duplicate usageflags values for json and xml
- [#1203](https://github.com/Azure/typespec-azure/pull/1203) Have `@clientName` work for operation groups as well
- [#1222](https://github.com/Azure/typespec-azure/pull/1222) Validate `@clientName` conflict for operations inside interface

### Features

- [#1090](https://github.com/Azure/typespec-azure/pull/1090) Support model format of `@multipartBody`
- [#1237](https://github.com/Azure/typespec-azure/pull/1237) Expose createTcgcContext, which is the minimal context object that handles scope
- [#1223](https://github.com/Azure/typespec-azure/pull/1223) Report error diagnostic when trying to flattening a model with polymorphism
- [#1076](https://github.com/Azure/typespec-azure/pull/1076) Add example types support
- [#1204](https://github.com/Azure/typespec-azure/pull/1204) Add xml usage and change enumvalue arg representation in generic decorators

### Breaking Changes

- [#1015](https://github.com/Azure/typespec-azure/pull/1015) Refactor tcgc build-in types, please refer pr's description for details and migration guides


## 0.44.1

### Bug Fixes

- [#1186](https://github.com/Azure/typespec-azure/pull/1186) fix access and usage calculation for nested model/enum in spread model
- [#1185](https://github.com/Azure/typespec-azure/pull/1185) fix idempotent issue for spread

### Features

- [#1119](https://github.com/Azure/typespec-azure/pull/1119) Report diagnostics on `@clientName` conflicts


## 0.44.0

### Bug Fixes

- [#1142](https://github.com/Azure/typespec-azure/pull/1142) TCGC, Add description to `SdkHttpResponse`
- [#1102](https://github.com/Azure/typespec-azure/pull/1102) Fixing typo
- [#1157](https://github.com/Azure/typespec-azure/pull/1157) findContextPath need to handle nested operation group, also refine the logic for naming and composing cross language definition id

### Bump dependencies

- [#1104](https://github.com/Azure/typespec-azure/pull/1104) Dependency updates July 2024

### Features

- [#1152](https://github.com/Azure/typespec-azure/pull/1152) add `.generateConvenient` and `.generateProtocol` for service methods. These booleans tell emitters whether to generate convenient and protocol versions for the method
- [#1129](https://github.com/Azure/typespec-azure/pull/1129) add `UsageFlags.Json`. Will be set if a model is used with a JSON content type
- [#1045](https://github.com/Azure/typespec-azure/pull/1045) filter api versions enum to only include GA versions if default value is GA

### Breaking Changes

- [#1078](https://github.com/Azure/typespec-azure/pull/1078) remove `experimental_` prefix from `sdkPackage`. Now it's just called `sdkPackage`.


## 0.43.2

### Bug Fixes

- [#1120](https://github.com/Azure/typespec-azure/pull/1120) fix wrong client resolving from multiple call of context creation for versioning tsp
- [#1067](https://github.com/Azure/typespec-azure/pull/1067) Unify casing of datetime spelling to `DateTime`. Change interface names to `SdkDateTimeType`, `SdkUtcDateTimeType`, and `SdkOffsetDateTimeType`
- [#1113](https://github.com/Azure/typespec-azure/pull/1113) Add `Content-Type` to response headers
- [#1135](https://github.com/Azure/typespec-azure/pull/1135) fix wrong handling for one variant union

### Features

- [#966](https://github.com/Azure/typespec-azure/pull/966) export decorators in allow list to all sdk types
- [#1075](https://github.com/Azure/typespec-azure/pull/1075) Replace `tspNamespace` with `crossLanguageDefinitionId`.
- Remove `tspNamespace` in `SdkEnumType`, `SdkModelType`, `SdkUnionType`, `SdkArrayType`.
- Add `crossLanguageDefinitionId` to `SdkUnionType` and `SdkArrayType`.
- [#1069](https://github.com/Azure/typespec-azure/pull/1069) Add `Error` usage to `UsageFlags`

### Breaking Changes

- [#886](https://github.com/Azure/typespec-azure/pull/886) always spread models and aliases with `...`


## 0.43.1

### Bug Fixes

- [#1000](https://github.com/Azure/typespec-azure/pull/1000) Add `name` and `tspNamespace` to `SdkArrayType`
- [#1009](https://github.com/Azure/typespec-azure/pull/1009) add `tspNamespace` to `SdkModelType`, `SdkEnumType`, `SdkEnumValueType` and `SdkUnionType`
- [#1033](https://github.com/Azure/typespec-azure/pull/1033) only expose top level client in `SdkPackage`
- [#1070](https://github.com/Azure/typespec-azure/pull/1070) don't let optional `.contentTypes` on response body be empty. If it's empty, just set it to undefined
- [#873](https://github.com/Azure/typespec-azure/pull/873) add description for created discriminator property
- [#947](https://github.com/Azure/typespec-azure/pull/947) support new typespec emitter naming rule
- [#990](https://github.com/Azure/typespec-azure/pull/990) export `SdkClientAccessor`
- [#1032](https://github.com/Azure/typespec-azure/pull/1032) Fix armId not set for scalar type armResourceIdentifier.
- [#1038](https://github.com/Azure/typespec-azure/pull/1038) add support for list of scopes
- [#1064](https://github.com/Azure/typespec-azure/pull/1064) remove deprecated `.nameInClient` property from `SdkModelPropertyType`s
- [#1050](https://github.com/Azure/typespec-azure/pull/1050) Fix SdkContext.arm
- [#1066](https://github.com/Azure/typespec-azure/pull/1066) Add linter for empty `@clientName` values


## 0.43.0

### Bug Fixes

- [#904](https://github.com/Azure/typespec-azure/pull/904) don't add constant value to generated name
- [#873](https://github.com/Azure/typespec-azure/pull/873) add description for created discriminator property
- [#947](https://github.com/Azure/typespec-azure/pull/947) support new typespec emitter naming rule
- [#930](https://github.com/Azure/typespec-azure/pull/930) expose enums on response headers
- [#962](https://github.com/Azure/typespec-azure/pull/962) refine logic of core model filtering
- [#950](https://github.com/Azure/typespec-azure/pull/950) remove duplicated types in TCGC
- [#936](https://github.com/Azure/typespec-azure/pull/936) enhance cross language definition id logic
- [#935](https://github.com/Azure/typespec-azure/pull/935) add read only logic to usage propagation

### Bump dependencies

- [#867](https://github.com/Azure/typespec-azure/pull/867) Update dependencies - May 2024

### Breaking Changes

- [#925](https://github.com/Azure/typespec-azure/pull/925) change default of `.access` on a model or enum to `"public"` instead of `undefined`
- [#870](https://github.com/Azure/typespec-azure/pull/870) return nullable types as a new type called `SdkNullableType`


## 0.42.3

### Bug Fixes

- [#834](https://github.com/Azure/typespec-azure/pull/834) map discriminator string value type to enum value type
- [#826](https://github.com/Azure/typespec-azure/pull/826) change from using logical result to final result
- [#826](https://github.com/Azure/typespec-azure/pull/826) add union support for templated model naming


## 0.42.2

### Bug Fixes

- [#818](https://github.com/Azure/typespec-azure/pull/818) Fix: Crash due to using api from next version of the compiler


## 0.42.1

### Bug Fixes

- [#766](https://github.com/Azure/typespec-azure/pull/766) add generated names for constants
- [#808](https://github.com/Azure/typespec-azure/pull/808) Fix error response when error model has statusCode
- [#797](https://github.com/Azure/typespec-azure/pull/797) add void and never handling for parameter and return types
- [#805](https://github.com/Azure/typespec-azure/pull/805) propagate api version from parent if not explicitly set
- [#801](https://github.com/Azure/typespec-azure/pull/801) `getDefaultApiVersion` and service version enum hornor api version config
- [#432](https://github.com/Azure/typespec-azure/pull/432) Add support for values


## 0.42.0

### Bug Fixes

- [#788](https://github.com/Azure/typespec-azure/pull/788) fix wrong default version for interface from extends


## 0.41.9

### Bug Fixes

- [#745](https://github.com/Azure/typespec-azure/pull/745) allow callers of createSdkContext to ignore default version projection
- [#778](https://github.com/Azure/typespec-azure/pull/778) tie api version information to clients so we can have diff api version information per client
- [#780](https://github.com/Azure/typespec-azure/pull/780) fix duplicated content type parameter for rpc lro


## 0.41.8

### Bug Fixes

- [#753](https://github.com/Azure/typespec-azure/pull/753) fix usage propagation from sub types


## 0.41.7

### Bug Fixes

- [#748](https://github.com/Azure/typespec-azure/pull/748) add crossLanguageDefinitionId onto method types


## 0.41.6

### Bug Fixes

- [#741](https://github.com/Azure/typespec-azure/pull/741) use correct default api version when projecting to a specific version


## 0.41.5

### Bug Fixes

- [#727](https://github.com/Azure/typespec-azure/pull/727) export int and float type judgement function
- [#731](https://github.com/Azure/typespec-azure/pull/731) fix `@clientName` lost after adding versioning support
- [#726](https://github.com/Azure/typespec-azure/pull/726) fix additional property union naming problem


## 0.41.4

### Bug Fixes

- [#692](https://github.com/Azure/typespec-azure/pull/692) fix wrong judgement for array type
- [#559](https://github.com/Azure/typespec-azure/pull/559) take lroMetadata.finalResult into consideration
- [#700](https://github.com/Azure/typespec-azure/pull/700) support get common models for specific api version, default to latest api version which may include breaking changes
- [#713](https://github.com/Azure/typespec-azure/pull/713) enhance versioning and add tests


## 0.41.3

### Bug Fixes

- [#665](https://github.com/Azure/typespec-azure/pull/665) support typespec new additional properties syntax
- [#680](https://github.com/Azure/typespec-azure/pull/680) adjust sequence of properties calculation and discriminator calculation
- [#673](https://github.com/Azure/typespec-azure/pull/673) add subscriptionId to client parameters

### Bump dependencies

- [#663](https://github.com/Azure/typespec-azure/pull/663) Upgrade dependencies


## 0.41.2

### Bug Fixes

- [#649](https://github.com/Azure/typespec-azure/pull/649) add `.crossLanguagePackageId` onto `SdkContext` types. This is a package id that is shared across languages, allowing linkage between packages generated across different languages
- [#651](https://github.com/Azure/typespec-azure/pull/651) fix wrong propagation for nullable properties
- [#656](https://github.com/Azure/typespec-azure/pull/656) change service method parameter impl
- [#585](https://github.com/Azure/typespec-azure/pull/585) fix api version and pageable result path issue
- [#625](https://github.com/Azure/typespec-azure/pull/625) support nullable additional properties
- [#624](https://github.com/Azure/typespec-azure/pull/624) fix orphan union as enum has no usage problem
- [#643](https://github.com/Azure/typespec-azure/pull/643) fix cross language definition id issue
- [#655](https://github.com/Azure/typespec-azure/pull/655) fix wire type nullable info
- [#630](https://github.com/Azure/typespec-azure/pull/630) use diagnostic system to raise errors and warnings


## 0.41.1

### Bug Fixes

- [#597](https://github.com/Azure/typespec-azure/pull/597) fix api version and pageable result path issue


## 0.41.0

### Bug Fixes

- [#556](https://github.com/Azure/typespec-azure/pull/556) ensure apiVersion parameter is always generated with name `apiVersion`
- [#563](https://github.com/Azure/typespec-azure/pull/563) filter out `TypeSpec.ARM` models as well from `sdkPackage.models`
- [#434](https://github.com/Azure/typespec-azure/pull/434) Fix wrong client cache for package clients calculation
- [#561](https://github.com/Azure/typespec-azure/pull/561) fix template naming for enums
- [#508](https://github.com/Azure/typespec-azure/pull/508) fix wrong usage calculation for enum value model property
- [#517](https://github.com/Azure/typespec-azure/pull/517) fix wrong union `generatedName` flag and refine templated model naming
- [#389](https://github.com/Azure/typespec-azure/pull/389) rollback change of union as enum with hierarchy
- [#412](https://github.com/Azure/typespec-azure/pull/412) prevent carry over for `@clientName`
- [#569](https://github.com/Azure/typespec-azure/pull/569) don't recursively set `MultipartFormData` usage for models that are properties on a `MultipartFormData` model
- [#572](https://github.com/Azure/typespec-azure/pull/572) Set spread model with none usage
- [#501](https://github.com/Azure/typespec-azure/pull/501) rename UsageFlags.Versioning to UsageFlags.ApiVersionEnum

### Bump dependencies

- [#437](https://github.com/Azure/typespec-azure/pull/437) Update dependencies

### Features

- [#384](https://github.com/Azure/typespec-azure/pull/384) return Versions enum as part of getAllModels
- [#538](https://github.com/Azure/typespec-azure/pull/538) When no server url is passed, we still set serverUrl to `{endpoint}` and make one templateArg for `endpoint`. This way, emitters can always look at a combination of serverUrl and templateArguments to get the full picture
- [#395](https://github.com/Azure/typespec-azure/pull/395) add a cached getHttpOperation helper function
- [#402](https://github.com/Azure/typespec-azure/pull/402) add `discriminatorProperty` ref to discriminated model
- [#474](https://github.com/Azure/typespec-azure/pull/474) create SdkEndpointType to encapsulate templating and url
- [#413](https://github.com/Azure/typespec-azure/pull/413) Add `@access` and `@usage` support for named union
- [#502](https://github.com/Azure/typespec-azure/pull/502) add UsageFlags.MultipartFormData to represent whether a model is used as form data
- [#551](https://github.com/Azure/typespec-azure/pull/551) add `isGeneratedName` to `SdkModelPropertyTypes`
- [#455](https://github.com/Azure/typespec-azure/pull/455) We've added Usage.JsonMergePatch. Usage.Input continues to refer to all inputs, Usage.JsonMergePatch is set if a model is explicitly set as JSON merge patch input body
- [#572](https://github.com/Azure/typespec-azure/pull/572) Workaround for arm provider method parameter
- [#573](https://github.com/Azure/typespec-azure/pull/573) support sclar doc
- [#393](https://github.com/Azure/typespec-azure/pull/393) give a nonredundant name for templated instance model
- [#513](https://github.com/Azure/typespec-azure/pull/513) all clients now have an initialization property. whether the initialization property is public or not determines whether an end-user should instantiate that client

### Deprecations

- [#560](https://github.com/Azure/typespec-azure/pull/560) add deprecation for `getResponseMapping()` on method, switch to `.resultPath` on `SdkServiceMethodResponse` instead
- [#504](https://github.com/Azure/typespec-azure/pull/504) deprecate `.arm` on `SdkClientType`. Instead, you should access `.arm` on your `SdkContext`
- [#381](https://github.com/Azure/typespec-azure/pull/381) deprecating isErrorOrChildOfError. Users should directly use isErrorModel from the standard TypeSpec library
- [#445](https://github.com/Azure/typespec-azure/pull/445) Users should call `.name` instead of `.nameInClient` on `SdkModelPropertyType`s
- [#447](https://github.com/Azure/typespec-azure/pull/447) move nullability onto params and responses. Add nullableValues on SdkArrayType and SdkDictionaryType
- [#503](https://github.com/Azure/typespec-azure/pull/503) Deprecate `.isError` on an `SdkModelType`. With `SdkPackage`, you should not need to know that a model is used as an error.
- [#511](https://github.com/Azure/typespec-azure/pull/511) Remove support for unused `.overloads` and `.overloading` on `SdkMethod`

### Breaking Changes

- [#451](https://github.com/Azure/typespec-azure/pull/451) adjust generated discriminator property sequence to prevent potential breaking change
- [#459](https://github.com/Azure/typespec-azure/pull/459) enums are always fixed after we switch to use union to represent extensible enum
- [#444](https://github.com/Azure/typespec-azure/pull/444) SdkUnionType, SdkEnumType, and SdkModelType will now always have a `.name` property. `.isGeneratedName` is now a boolean that expresses whether the `.name` was generated or described in the tsp
- [#524](https://github.com/Azure/typespec-azure/pull/524) depcreate getParameterMapping and make .bodyParam on SdkHttpOperation a single optional param instead of list
- [#536](https://github.com/Azure/typespec-azure/pull/536) git status
- [#515](https://github.com/Azure/typespec-azure/pull/515) change responses from a record to a mapping of status code, range, or default


## 0.40.0

### Bug Fixes

- [#305](https://github.com/Azure/typespec-azure/pull/305) getAllModels will return models only used as final envelope results in non-ARM definitions
- [#335](https://github.com/Azure/typespec-azure/pull/335) unions with only null and another type will not be converted to union
- [#362](https://github.com/Azure/typespec-azure/pull/362) enhance logic for value type of enum and union as enum
- [#314](https://github.com/Azure/typespec-azure/pull/314) support @clientName for extensible enum variant
- [#328](https://github.com/Azure/typespec-azure/pull/328) add support for anonymous union as enum and fix union as enum variant discriminator typing problem
- [#301](https://github.com/Azure/typespec-azure/pull/301) Add usage calculation for additional properties with model type
- [#327](https://github.com/Azure/typespec-azure/pull/327) rollback some of the breaking changes for common model types method
- [#260](https://github.com/Azure/typespec-azure/pull/260) allow models to have a union variant as a discriminator
- [#286](https://github.com/Azure/typespec-azure/pull/286) don't throw for unknown format
- [#274](https://github.com/Azure/typespec-azure/pull/274) Update doc for `@access` and `@usage`

### Bump dependencies

- [#243](https://github.com/Azure/typespec-azure/pull/243) Update dependencies

### Features

- [#341](https://github.com/Azure/typespec-azure/pull/341) add support for azureLocation scalar in azure core
- [#242](https://github.com/Azure/typespec-azure/pull/242) add flattened property onto SdkBodyModelPropertyType
- [#315](https://github.com/Azure/typespec-azure/pull/315) add validation on import of tcgc and remove duplicate validation warnings
- [#350](https://github.com/Azure/typespec-azure/pull/350) add helper function getCrossLanguagePackageId. getCrossLanguagePackageId returns a package id that is consistent across languages, allowing emitters to identify that they are generating from the same service tsp
- [#306](https://github.com/Azure/typespec-azure/pull/306) add getClientTypeWithDiagnostics and getAllModelsWithDiagnostics to get values back with diagnostics

### Breaking Changes

- [#295](https://github.com/Azure/typespec-azure/pull/295) Split datetime type into utcDateTime and offsetDateTime to remain in sync with tsp


## 0.39.2

### Patch Changes

- Handle enums inside a union of literals

## 0.39.0

### Minor Changes

- 3f98132: Add new `MultipartFile` type
- c07c189: error out if user tries to encode bytes in multipart input
- acfb045: Add support for creating an `enum` from a `union` declaration
- 3997779: tcgc will return the raw tsp types to emitters, instead of doing more conversion

### Patch Changes

- 1f1864a: fix incorrect linter error for models not directly used in multipart operations


## 0.38.0

Wed, 24 Jan 2024 05:47:19 GMT

### Minor changes

- Update dependencies.

### Updates

- Add type info for additional properties in model type.
- add decorator @clientName
- Fix missing models when client hierarchy and naming issue for enum with projected name.
- Renamed template parameters for clarity and consistency.
- add support for encodedName
- feat(decorator): add `@flattenProperty`
- remove dynamic testing to support vitest plugin
- add tests for unions of literals and types
- Update dependencies

## 0.37.0

Wed, 06 Dec 2023 19:47:28 GMT

### Minor changes

- Update dependencies.

### Updates

- Generate naming for anonymous model or union
- Support unbranded client and operation group detection
- Support scope for @client and @operationGroup
- Support decimal build-in kind
- Fix corner case for anonymous model
- Support scope for protocolAPI and convenientAPI

## 0.36.1

Tue, 28 Nov 2023 23:33:07 GMT

### Patches

- ~add scope to protocolApi, convenient

## 0.36.0

Wed, 08 Nov 2023 00:11:02 GMT

### Minor changes

- Update dependencies.

### Updates

- add parent enum as type on SdkEnumValueType
- Deprecate @include, @exclude, @internal, @clientFormat
- Add emitterName and emitterContext to SdkContext
- Fix access propagation regression
- Fix usage override for orphan enum
- `TypeScript` use `types` entry under `exports` of `package.json` instead of legacy `typesVersions` to provide the definition files
- **BREAKING CHANGE** Minimum node version increased to 18

## 0.35.0

Wed, 11 Oct 2023 23:51:36 GMT

### Updates

- add support for cross language definition id
- add arm to sdk context
- Migrate 'friendly-name' rule from typespec-code-generator-core to typespec-azure-core.
- refactor utils.test.ts
- return tsp Union type for string literal union
- Remove dependency to `@typespec/lint`
- Fix wrong type for the values of SdkTupleType
- Refine logic and test for @access
- Refine getAllModels implementation including: add deprecation info, add known values, change discriminator type in base model, etc.
- Fix the problem of models with duplicate name
- Change union type handling logic in common interface
- Update dependencies
- Uptake changes to http libraries with status code ranges

## 0.34.0

Tue, 12 Sep 2023 21:49:08 GMT

### Minor changes

- Update dependencies.

### Updates

- determine whether service is arm or not
- add docs for SdkTypes
- handle both @friendlyName and @projectedName in function getLibraryName()
- deduplicate models in map
- fix enum discriminator type for base class
- add getAllModels
- make \_\_raw optional
- Add tuple type support
- Add @usage and @access decorators.

## 0.33.0

Tue, 08 Aug 2023 22:32:23 GMT

### Minor changes

- Update dependencies.

### Updates

- add transitivity support for @include
- Fix the `getEmitterTargetName` function to use the real name of the emitter

## 0.32.0

Tue, 11 Jul 2023 22:06:14 GMT

### Minor changes

- Update dependencies.

### Updates

- adding scope to include and exclude decorator
- fix for decorator about "Scalar extends string/numeric"
- Update dependencies

## 0.31.0

Tue, 06 Jun 2023 22:44:32 GMT

### Minor changes

- Update dependencies.

### Updates

- Add @typespec/versioning peer dependency.
- Use original type if scalar has encode decorator.
- Add temporary workaround to deal with `uri` scalar without format
- adding scope to internal decorator
- Remove reference to `object` in decorators and templates
- Updated decorators to use `valueof`

## 0.30.0

Wed, 10 May 2023 21:24:14 GMT

### Minor changes

- Update dependencies.

### Updates

- expose getSdkModelPropertyType
- expose enum converter
- add duration to client format
- Add lint rule for @friendlyName.
- export getSdkConstant
- Compete transitive closure of @internal methods and models
- generate nullable enums
- refine types in union and enum
- remove support for zonedDateTime

## 0.29.0

Tue, 11 Apr 2023 18:49:21 GMT

### Minor changes

- Update dependencies.

### Updates

- temporarily add back zonedDateTime support
- fix intrinsic type checking in getSdkSimpleType
- expose list and dict converter
- Update Client and Dpg prefixes to be Sdk for consistency
- Add DPG shared interfaces and initial logic to create a method response
- add support for unions
- expose converter functions, fix simple sdk types
- Uptake changes to datetime types

## 0.28.0

Mon, 13 Mar 2023 21:30:57 GMT

### Minor changes

- Update dependencies.

### Updates

- correct regex for language emitters

## 0.27.0

Fri, 03 Mar 2023 19:59:30 GMT

### Minor changes

- Update dependencies.

### Updates

- Export embedded models in Array/List/Model for `getAllModels`.
- fix getAllModels when there are no models
- Update package homepage link to github.io page
- Renaming DPG package name to typespec-client-generator-core. Namespace is changed to Azure.ClientGenerator.Core
- Adopted the new `@typespec/http` library
- update entrypoint to tspMain
- Rename to TypeSpec

## 0.26.0

Tue, 07 Feb 2023 21:56:32 GMT

### Minor changes

- Update dependencies.

### Patches

- add getAllSchemas

### Updates

- Add getPropertyNames
- add extern dec docs
- cadl-dpg, isApiVersion, support identify api version defined as host parameter in @server
- add clientFormat decorator
- Add decorators @include and @exclude
- add @internal decorator
- Suppress PascalCase naming rule on DPG namespace
- Removed `@convenienceAPI` decorator. Removed `getConvenienceAPIName` function.
- switch all exposed cadl-dpg functions to input context

## 0.25.0

Fri, 13 Jan 2023 00:05:37 GMT

### Minor changes

- Update dependencies.

### Patches

- add getClientNamespace helper method

### Updates

- Add protocolAPI/convenientAPI

## 0.24.0

Wed, 07 Dec 2022 17:21:54 GMT

### Minor changes

- Update dependencies.
- Uptake changes to allow multiple services

### Patches

- Update dependencies

## 0.3.0

Sat, 12 Nov 2022 00:14:23 GMT

### Minor changes

- add isApiVersion helper
- Update dependencies.

### Patches

- add getDefaultApiVersion
- Update repository information

### Updates

- add utils file, fix tests

## 0.2.0

Mon, 24 Oct 2022 21:57:17 GMT

### Minor changes

- Add `@client` and `@operationGroup` decorators
- @client defined under a service namespace will resolve the service automatically
- listOperationsInOperationGroup will not resolve operations nested under another @client
