# Change Log - @azure-tools/typespec-autorest

## 0.44.0

### Bug Fixes

- [#1081](https://github.com/Azure/typespec-azure/pull/1081) Fix patch models for common-types

### Bump dependencies

- [#1104](https://github.com/Azure/typespec-azure/pull/1104) Dependency updates July 2024

### Features

- [#1116](https://github.com/Azure/typespec-azure/pull/1116) Resolve Arm Common Definitions for enums and unions as well
- [#955](https://github.com/Azure/typespec-azure/pull/955) Use emit-lro--options emitter option to control emission of x-ms-long-running-operation-options
- [#955](https://github.com/Azure/typespec-azure/pull/955) Add support for displaying lro options in typespec-autorest based on lro metadata
- [#1123](https://github.com/Azure/typespec-azure/pull/1123) Removed direct reference to OpenAPI extension `x-ms-azure-resource` in ARM library and replaced with `@Azure.ResourceManager.Private.azureResourceBase` decorator. It is only used internally on base resource types. `autorest` emitter has been updated to check the decorator and still emit `x-ms-azure-resource` extension in swagger.

### Breaking Changes

- [#1105](https://github.com/Azure/typespec-azure/pull/1105) `x-ms-client-flatten` extension on some of resource properties property is now configurable to be emitted by autorest emitter. Default is false which will skip emission of that extension.


## 0.43.0

### Bug Fixes

- [#923](https://github.com/Azure/typespec-azure/pull/923) When emitting version enum only include current version and mark with `modelAsString: true`
- [#902](https://github.com/Azure/typespec-azure/pull/902) Add support for new multipart constructs in http library
- [#432](https://github.com/Azure/typespec-azure/pull/432) Add support for tuple literals as default values

### Bump dependencies

- [#867](https://github.com/Azure/typespec-azure/pull/867) Update dependencies - May 2024

### Features

- [#955](https://github.com/Azure/typespec-azure/pull/955) Use emit-lro--options emitter option to control emission of x-ms-long-running-operation-options
- [#955](https://github.com/Azure/typespec-azure/pull/955) Add support for displaying lro options in typespec-autorest based on lro metadata
- [#972](https://github.com/Azure/typespec-azure/pull/972) Add API to programmatically get all the OpenAPI2 documents for all services at all versions in a spec
- [#811](https://github.com/Azure/typespec-azure/pull/811) Add dependency on typespec-azure-resource-manager to resolve the spec repo common types paths
- [#813](https://github.com/Azure/typespec-azure/pull/813) `@summary` sets the title of definitions

### Breaking Changes

- [#473](https://github.com/Azure/typespec-azure/pull/473) Enums are not extensible by default anymore. Update to an extensible union `union Foo {a: "a", b: "b", string}`


## 0.42.1

### Bug Fixes

- [#839](https://github.com/Azure/typespec-azure/pull/839) Do not omit unreferenced non version enum when `omit-unreachable-types` is not set to true


## 0.42.0

### Bug Fixes

- [#745](https://github.com/Azure/typespec-azure/pull/745) prevent tcgc versioning projection
- [#293](https://github.com/Azure/typespec-azure/pull/293) Add support for new `@body` `@bodyRoot` and `@bodyIgnore` decorators

### Bump dependencies

- [#663](https://github.com/Azure/typespec-azure/pull/663) Upgrade dependencies

### Features

- [#765](https://github.com/Azure/typespec-azure/pull/765) [API] Refactor to provide functions to get the OpenAPI programtically

### Breaking Changes

- [#774](https://github.com/Azure/typespec-azure/pull/774) Version enum is now omitted by default. Use `version-enum-strategy: include` to revert behavior.


## 0.41.1

### Bug Fixes

- [#568](https://github.com/Azure/typespec-azure/pull/568) Small performance improvements


## 0.41.0

### Bug Fixes

- [#414](https://github.com/Azure/typespec-azure/pull/414) updating autorest to emit response headers in lexicographic order
- [#512](https://github.com/Azure/typespec-azure/pull/512) Fix: Discriminated inheritance wasn't resolving the `x-ms-discriminator-value` when it had an intermediate model.

### Bump dependencies

- [#437](https://github.com/Azure/typespec-azure/pull/437) Update dependencies

### Features

- [#407](https://github.com/Azure/typespec-azure/pull/407) Add support for new `Azure.Core.armResourceManager` scalar


## 0.40.0

### Bump dependencies

- [#243](https://github.com/Azure/typespec-azure/pull/243) Update dependencies

### Features

- [#337](https://github.com/Azure/typespec-azure/pull/337) Add support for all properties of openapi `info` object on the `@info` decorator
- [#277](https://github.com/Azure/typespec-azure/pull/277) Support `@flattenProperty` decorator.


## 0.39.2

### Patch Changes

- 9baadd2: `readonly` was not added when `use-read-only-status-schema` is set to `true` for union types.
- 9baadd2: Fix `UnionType | null` would be inlined instead of referencing `UnionType`

## 0.39.1

### Patch Changes

- b5fa501: Support default value for union properties
- b5fa501: Fix: Description being ignored on unions

## 0.39.0

### Minor Changes

- a1a2be7: Respect `@clientName` decorator from `@azure-rest/typespec-client-generator-core` library where `@projectedName("client")` used to work.

### Patch Changes

- 2f6bbc4: Fix: Inline enums properties with default values as `default` is not allowed next to `$ref`
- 8b072f4: Emit warning if using opendIdConnect http auth scheme
- 148eee4: Update references to ARM, Add template customization parameters, add migration docs


## 0.38.1

Mon, 29 Jan 2024 22:16:39 GMT

### Patches

- Fix: Autorest emitter should generated format: decimal

## 0.38.0

Wed, 24 Jan 2024 05:47:18 GMT

### Minor changes

- Update dependencies.

### Updates

- Add support for `@encodedName` decorator
- Update dependencies

## 0.37.2

Thu, 14 Dec 2023 01:19:27 GMT

### Patches

- Fix: Multipart property of type `bytes[]` is now treated as multiple file parts

## 0.37.1

Mon, 11 Dec 2023 18:44:34 GMT

### Patches

- Fix: enums created from named unions will keep have the union name carry over to `x-ms-enum.name`

## 0.37.0

Wed, 06 Dec 2023 19:47:28 GMT

### Minor changes

- Update dependencies.

### Updates

- Adds validation of '@format' decorator.
- Support EmbeddingVector types from Azure.Core.
- Added support for more complex unions of literals which could be represented with `enum: []`
- Minor change on docs
- Added support for string templates

## 0.36.1

Tue, 14 Nov 2023 20:35:54 GMT

### Patches

- Fix: `discriminator` property will always be marked as required to produce a valid Swagger 2.0 spec.
- Fix: Multipart with `bytes` part will now produce `type: file` instead of `type: string, format: binary`
- Fix: Multipart with json part will now produce `type: string` and report a warning as json parts are not supported in swagger 2.0.

## 0.36.0

Wed, 08 Nov 2023 00:11:02 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix: Stops emitting an error when using `@body _: void` in operation parameters and treat it as no body.
- Allow automatic disambiguation of x-ms-paths when signatures don't differ by query params.
- `TypeScript` use `types` entry under `exports` of `package.json` instead of legacy `typesVersions` to provide the definition files
- **BREAKING CHANGE** Minimum node version increased to 18

## 0.35.2

Tue, 31 Oct 2023 19:47:30 GMT

### Patches

- Fix #3794 Allow casing override for OperationId
- Fix: Query or header parameters with a type of array of enum would produce an invalid OpenAPI2.0 spec where the enum would be referenced with a `$ref` which is not allowed inside a parameter definition.
- Fix `x-ms-discriminator-value` was not set when a child discriminated model was referenced directly
- Fix: `x-ms-paths` implicit disambiguation would create invalid parameter. Instead `_overload` dummy parameter is always added.

## 0.35.1

Sat, 28 Oct 2023 15:59:07 GMT

### Patches

- Allow automatic disambiguation of x-ms-paths when signatures don't differ by query params.

## 0.35.0

Wed, 11 Oct 2023 23:51:36 GMT

### Minor changes

- Update dependencies.

### Updates

- A diagnostic will now be emitted for any HTTP authentication scheme not supported by OpenAPI 2
- Fix: Use `null` as a default
- Update dependencies
- Add support for status code ranges

## 0.34.0

Tue, 12 Sep 2023 21:49:08 GMT

### Minor changes

- Update dependencies.

### Updates

- Handle general encodings for utcDateTime
- Fix: handling of `model extends Record<T>` and `model is Record<T>`
- Fix: Resolve the correct `nextLinkName` if property name has `.`.
- Fix header with encode rfc7231
- Fix: Autorest output wasn't sorting the properties in known extensions
- Fix issue where properties with "create" visibility did not appear when using the CreateOrUpdate PATCH-based template.

## 0.33.0

Tue, 08 Aug 2023 22:32:22 GMT

### Minor changes

- Update dependencies.

### Updates

- Annotate long-running operations with "x-ms-long-running-operation".
- Fix: Apply `@minItems` and `@maxItems` decorators on model array.
- Add interpolation support for the `arm-types-dir` for the `emitter-output-dir` variable
- Add support for `@info` decorator providing the ability to specify the additional fields from openapi info object.

## 0.32.0

Tue, 11 Jul 2023 22:06:14 GMT

### Minor changes

- Update dependencies.

### Updates

- Allow discriminator to be an enum
- Add warning for unsupported empty enums.
- Show error details when failing to load an example file
- **Change** Added a determinstic ordering to the generated openapi document. This might result in some different ordering as previously.
- Add support for nullable enums properties
- Omitting `x-typespec-name` extension by default from autorest output. A new flag `include-x-typespec-name: "inline-only" | "never"` has been added to get previous behavior.
- Create readOnly schema for provisioningState
- AutoRest emitter now reports on non-specific scalar types like `numeric`, `integer`, and `float`.
- Update dependencies

## 0.31.0

Tue, 06 Jun 2023 22:44:32 GMT

### Minor changes

- Update dependencies.

### Updates

- (Breaking) It is now an error to have multiple example files with the same operation ID and title. Previously, this would silently overwrite x-ms-examples entries in the output. To fix, choose a unique title for each example of any given operation.
- Fix: Documentation on `model is x[]` was not included in schema description
- Implicit body is marked as `required`
- Fix: derived scalar doc ignored
- Fix: `@encode` encoding doesn't override target type format
- Fix: Encoding resolution for model properties and add back `unixtime`
- Fix: operation parameter doc should was ignored if the parameter type had a doc
- add support for decimal and decimal128
- Uptake doc comment changes
- Add emitter options description
- Remove reference to `object` in decorators
- Updated decorators to use `valueof`

## 0.30.1

Sat, 20 May 2023 01:52:45 GMT

### Patches

- Fix: `arm-types-dir` using absolute reference(e.g. using `{project-root}` would resolve path with extra `../`

## 0.30.0

Wed, 10 May 2023 21:24:14 GMT

### Minor changes

- Update dependencies.

### Updates

- **Added** new option `arm-types-dir` used to specify the directory for the common arm common types
- Respect `client` projection target to resolve `operationId` and `x-ms-client-name`
- Add support for `@encode` decorator
- Cleanup deprecated items

## 0.29.0

Tue, 11 Apr 2023 18:49:21 GMT

### Minor changes

- Update dependencies.

### Updates

- **Breaking** `output-file` now use config path interpolation. Existing value must be change to include the values to interpolate. e.g. `custom.json` -> `{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/custom.json`
- Support share route scenarios with x-ms-paths.
- Add regression tests for versioning and projected names
- Remove deprecated autorest option from README.md
- **Breaking Change** Removed deprecated `@collectionFormat` decorator. Use `@header({format: })` or `@query({format:})` instead.
- Uptake changes to dateTime types

## 0.28.0

Mon, 13 Mar 2023 21:30:57 GMT

### Minor changes

- Update dependencies.

### Updates

- Avoid Read suffix in schemas split by visibility.

## 0.27.0

Fri, 03 Mar 2023 19:59:30 GMT

### Minor changes

- Update dependencies.

### Updates

- Support additionalProperties.
- Stop treating models spread into parameters as unreferenced.
- Update package homepage link to github.io page
- Revert back changelog
- Adopted the new `@typespec/http` library
- update entrypoint to tspMain
- Rename to TypeSpec

## 0.26.0

Tue, 07 Feb 2023 21:56:32 GMT

### Minor changes

- Update dependencies.

### Updates

- Adding extern dec decorator in cadl file
- Fix issue where operation parameters could not target model properties.
- Removed `@pageable` and `@asyncOperationOptions` decorators.
- Don't emit extra "canonical" model when always impacted by visibility
- Fix issues when multiple copies of library are loaded.

## 0.25.0

Fri, 13 Jan 2023 00:05:37 GMT

### Minor changes

- Update dependencies.

### Patches

- Emit collectionFormat from encoding options
- Generate recursive update schemas with optional properties for resource update operation

## 0.24.0

Wed, 07 Dec 2022 17:21:53 GMT

### Breaking changes

- Change behavior to generate enums with "modelAsString: true" unless the enum is decorated with `@fixed`.

### Minor changes

- Uptake new `getNamespaceFullName`
- Uptake deprecation of `uri` type in favor of `url` scalar
- Uptake changes to rest library api
- Omit metadata properties of type `never`
- Update dependencies.
- Update `invalid-union` diagnostic to be a warning instead of an error.
- Uptake change to emitter api with new `emitter-output-dir` option
- Uptake changes to allow multiple services
- Uptake change to compiler for new `scalar` type

### Patches

- Honor @header/@query/@path in parameter name
- Emit 'deprecated' operation property in cadl-autorest
- Remove undocumented use of atVersion projection
- Update dependencies

## 0.22.0

Sat, 12 Nov 2022 00:14:23 GMT

### Minor changes

- Feature: Add support for `unknown`
- Add automatic visibility and metadata handling
- Apply x-ms-mutability when "read" visibility is not present but "create" or "update" is.
- Add `output-dir` emitter options to override compiler default `output-dir`
- Update dependencies.

### Patches

- Support multipart form data.
- Fix handling of examples when using multiple API versions
- Fix: @extension on a model is intrinsic types are being applied

## 0.21.0

Wed, 12 Oct 2022 21:12:48 GMT

### Minor changes

- Add support for model property references.
- Uptake changes to core discriminator
- Empty object as a response will not produce a 204 response anymore
- Include `x-ms-skip-url-encoding: true` for `uri` server params
- Emitted swagger document include all types under the service namespace unless `omit-unreachable-types` option is set.
- Add support for `@minItems` and `@maxItems` decorators
- Update dependencies.
- Uptake move of `@discriminator` into compiler
- Apply changes to rest library
- Update info logging to use new tracing engine

### Patches

- Fix: `Content-Type` request header lookup is case insensitive
- Exclude properties of type `never` when emitting model schemas

## 0.20.0

Thu, 08 Sep 2022 01:05:13 GMT

### Minor changes

- Uptake changes to http service authentication oauth2 scopes.
- Add support for projected names. Using json projection to differentiate x-ms-client-name.
- string literal as constant enum
- Update dependencies.
- React to Type suffix removal
- Uptake change to enum members map type
- Uptake changes to compiler with current projection

### Patches

- Moving comparePath to private
- emit x-ms-error-response when @error applies

## 0.19.0

Thu, 11 Aug 2022 19:05:47 GMT

### Minor changes

- support collection format
- Update openapi emitter to work with Azure.Core.Page<T>. Deprecate @pageable.
- Internal: Uptake new compiler helpers to work with template types
- Added support for default value for properties with enum type.
- Added `new-line` endings emitter option to configure the line endings.
- Support set of unannotated parameters as request body
- Inline template instantiations without `@friendlyName`
- Update dependencies.
- Emit service authentication metadata that was applied to a service with `@useAuth`
- Uptake new `resolveOperationId` helper from openapi library improving the logic
- Add warning if there is no exposed routes
- Uptake changes to type relations
- Allow overriding `x-ms-parameter-location` for shared parameters using `@extension` decorator

### Patches

- Fix: Description being ignored on non-string primitive models
- Fix output-file setting not used when multi version and azure-resource-provider-folder
- fix infinite recurision
- Fix bug with zero enum values
- Remove `summary` property set on schemas and `parameters`
- Make response descriptions more consistent

### Updates

- update readme.md with decorator information

## 0.18.0

Fri, 08 Jul 2022 23:23:14 GMT

### Minor changes

- Update dependencies.
- Rename emitter options to be `kebab-case`
- Use new emitter options syntax

### Patches

- Detect effective schema type for spread models
- force operation id to upper case
- Inline parameters spread from anonymous model

## 0.17.0

Mon, 13 Jun 2022 23:42:46 GMT

### Minor changes

- Uptake changes to accessor diagnostics
- Update dependencies.
- Add support for new @server decorator used to specify api endpoints.
- Uptake changes to decorator context
- Uptake change to versioning library using enum instead of string for versions

### Patches

- Remove use of "path" library
- Added marker to indicate cadl generation
- Add dependency to Azure.Core.

### Updates

- Upgrade to TS4.7

## 0.16.0

Fri, 06 May 2022 17:20:15 GMT

### Minor changes

- Add description to discriminated model discriminator property
- Uptake change in compiler with children references
- Move decorators into `Autorest` namespace
- Support examplesDirectory emitter option
- Added validation to @asyncOperationOptions decorator
- Update dependencies.
- Remove node 14 support

### Patches

- Rearrange some aspects of operation output in the OpenAPI/Swagger 2 emitter
- Fix template errors when example directory does not exist
- add support for versioning
- Do not include discriminator property in child types
- Missing `@cadl-lang/versioning` as a peerDependency
- Fix: Rename `x-ms-identifier` -> `x-ms-identifiers`
- URI-encode refs

## 0.15.0

Thu, 31 Mar 2022 17:11:06 GMT

### Minor changes

- Add support for `@knownValues` to emit modelAsString=true enums
- Add support for `void` body to return 204
- Moved http response interpretation to @cadl-lang/rest library.
- Update dependencies.

### Patches

- add support for x-ms-identifier

## 0.14.0

Wed, 09 Mar 2022 17:42:26 GMT

### Minor changes

- @doc and @summary will set the description and summary on extended primitive types
- Emit child models to OpenAPI when parent is emitted
- **Added** support for `@externalDocs` decorator
- @doc on service namespace set openapi description
- Update dependencies.
- Uptake change to intrinsic types
- Fix issue where a model name the same as Cadl Intrinsic type would be treated the same.

### Patches

- Fix issue where parameter definitions were being duplicated unnecessarily

## 0.13.0

Tue, 15 Feb 2022 22:35:13 GMT

### Minor changes

- Support union values for status-code and content-type in responses
- Add @example decorator
- Update dependencies.

### Patches

- Add support for separate `@summary` from `@doc`

## 0.12.0

Fri, 11 Feb 2022 06:13:30 GMT

### Minor changes

- Update decorators with new interface

### Patches

- Bump dependency versions

## 0.11.0

Fri, 04 Feb 2022 18:01:35 GMT

### Minor changes

- Absorb projections change
- cadl-autorest support for discriminated unions
- Add support for extensions on parameters
- Uptake changes in @cadl-lang/rest library improving operation parameter handling
- Update cadl dependencies to peerDependencies
- Internals: switch to internal path manipulation
- **Added** values to `x-ms-enum` containing `@doc` for members and custom name/values if applicable
- Adopt statusCode decorator for http status code
- Update for new emitter syntax
- Use common decorator from @cadl-lang/openapi library

### Patches

- Adding @format decorator support for autorest to emit "format" for string types
- **Fix** Added support for nullable array `xzy[] | null`
- **Fix** issue with @body body: bytes producing `type: string, format: bytes` instead of `type: string, format: binary` for requests and response
- Add `friendlyName` decorator support to cadl-autorest emitter
- Renaming @format decorator to @pattern.
- Add cadl-autorest support for safeint

## 0.10.0

Thu, 16 Dec 2021 08:03:03 GMT

### Minor changes

- generate resource provider subfolder

### Patches

- Update emitter to use simplified getAllTags arguments
- Adjust emitter to support new @route model

## 0.9.2

Wed, 01 Dec 2021 22:56:37 GMT

### Patches

- Fix mapping of update method name to HTTP verb

## 0.9.1

Thu, 18 Nov 2021 13:58:37 GMT

### Patches

- Respond to new API changes in @cadl-lang/rest

## 0.9.0

Thu, 11 Nov 2021 21:46:47 GMT

### Minor changes

- **Added** Support for duration type

### Patches

- Define response body for primitive response type

## 0.8.1

Thu, 28 Oct 2021 21:20:34 GMT

### Patches

- Use strict diagnostics
- Fix logic for maxValue decorator
- Sort paths and definitions in cadl-autorest OpenAPI output files

## 0.8.0

Fri, 15 Oct 2021 21:33:37 GMT

### Minor changes

- **Added** Support for server default

## 0.7.0

Fri, 17 Sep 2021 00:49:37 GMT

### Minor changes

- Remove support for multiple inheritance

### Patches

- Updates for cadl namespace addition
- Support for emitting `bytes` and new number types

## 0.6.0

Sat, 21 Aug 2021 00:04:02 GMT

### Minor changes

- Introduce naming convention `$name` for JavaScript-defined Cadl functions and decorators

### Patches

- Allow x-ms-pageable in non-list operations (POST)

## 0.5.1

Fri, 13 Aug 2021 19:10:21 GMT

### Patches

- Fixes for retaining state over multiple compilations, allowing lro extensions, minimizing produces/consumes usage, removing empty response schema, fixes for dictionaries with complex value types

## 0.5.0

Tue, 10 Aug 2021 20:23:04 GMT

### Minor changes

- Rename package to @azure-tools/cadl-autorest

## 0.4.1

Mon, 09 Aug 2021 21:14:12 GMT

_Version update only_

## 0.4.0

Mon, 02 Aug 2021 18:17:00 GMT

### Minor changes

- Rename ADL to Cadl

## 0.3.2

Wed, 28 Jul 2021 19:40:06 GMT

### Patches

- Fix swagger generation bugs for empty schema and support host property

## 0.3.1

Fri, 09 Jul 2021 20:21:06 GMT

### Patches

- Catch ErrorType instances while walking ADL types so that it's easier to diagnose syntax issues in source files
- Absorb base templated model instance into derived type's schema definition when it's the only base type

## 0.3.0

Thu, 24 Jun 2021 03:57:43 GMT

### Minor changes

- Add semantic error recovery

### Patches

- Fix decorator application to OpenAPI output when the target is a model property or operation parameter

## 0.2.1

Tue, 18 May 2021 23:43:31 GMT

_Version update only_

## 0.2.0

Thu, 06 May 2021 14:56:01 GMT

### Minor changes

- Implement alias and enum, remove model =

### Patches

- Replace several internal compiler errors with diagnostics

## 0.1.2

Tue, 20 Apr 2021 15:23:29 GMT

### Patches

- Trim base service namespace from parameter definition names
- Use new virtual file to emit output
