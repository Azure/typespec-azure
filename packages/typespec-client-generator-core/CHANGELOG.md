# Change Log - @azure-tools/typespec-client-generator-core

This log was last generated on Tue, 23 Jan 2024 23:47:52 GMT and should not be manually modified.

## 0.38.0
Tue, 23 Jan 2024 23:47:52 GMT

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
- make __raw optional
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

