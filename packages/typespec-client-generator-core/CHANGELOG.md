# Change Log - @azure-tools/typespec-client-generator-core

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
