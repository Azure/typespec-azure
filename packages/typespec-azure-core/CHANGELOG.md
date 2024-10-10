# Change Log - @azure-tools/typespec-azure-core

## 0.47.0

### Bug Fixes

- [#1416](https://github.com/Azure/typespec-azure/pull/1416) Fix #1180 Return StatusMonitor result field for non-resource PUT operations in getLroMetadata.finalResult

### Bump dependencies

- [#1534](https://github.com/Azure/typespec-azure/pull/1534) Bump dependencies


## 0.46.0

### Features

- [#1342](https://github.com/Azure/typespec-azure/pull/1342) Replace `no-operation-id` linter rule with a more generic `no-openapi` rule guarding against any use of openapi decorators


## 0.45.0

### Bug Fixes

- [#1198](https://github.com/Azure/typespec-azure/pull/1198) Use some more precise types for certain decorators that would have crashed otherwise

### Bump dependencies

- [#1219](https://github.com/Azure/typespec-azure/pull/1219) Update dependencies

### Features

- [#1154](https://github.com/Azure/typespec-azure/pull/1154) Add new `@azure-tools/typespec-azure-core/require-versioned` linting rule to require Azure service to use versioning library.
- [#1193](https://github.com/Azure/typespec-azure/pull/1193) Add new linter rule to prevent using items from Private namespace from an external library.


## 0.44.0

### Bug Fixes

- [#927](https://github.com/Azure/typespec-azure/pull/927) Remove explicit `all` rulesets

### Bump dependencies

- [#1104](https://github.com/Azure/typespec-azure/pull/1104) Dependency updates July 2024


## 0.43.0

### Bug Fixes

- [#693](https://github.com/Azure/typespec-azure/pull/693) Add new `no-string-discriminator` linter rule suggesting using an explicit extensible union as the discriminator kind.
- [#851](https://github.com/Azure/typespec-azure/pull/851) Convert `OperationState` enum  to an open union

### Bump dependencies

- [#867](https://github.com/Azure/typespec-azure/pull/867) Update dependencies - May 2024

### Features

- [#955](https://github.com/Azure/typespec-azure/pull/955) Add override decorator @useFinalStateVia for lro resolution when multiple resolution pathways exist
- [#707](https://github.com/Azure/typespec-azure/pull/707) Remove linter rules that are not relevant anymore: `use-extensible-enum` and `no-fixed-enum-discriminator`
- [#432](https://github.com/Azure/typespec-azure/pull/432) Add support for values


## 0.42.0

### Bug Fixes

- [#619](https://github.com/Azure/typespec-azure/pull/619) Add `no-generic-numeric` rule to disable LintDiff `IntegerTypeMustHaveFormat`
- [#760](https://github.com/Azure/typespec-azure/pull/760) Fix `rpc-operation-request-body` rule not actually checking for a body parameter.
- [#694](https://github.com/Azure/typespec-azure/pull/694) Fix crash when `Traits` builders gets passed non model
- [#710](https://github.com/Azure/typespec-azure/pull/710) Exempt versioning enums and discriminator enum/unions from `documentation-required` rule.
- [#740](https://github.com/Azure/typespec-azure/pull/740) Require documentation on most unions.
- [#293](https://github.com/Azure/typespec-azure/pull/293) Update to support new meaning of `@body`

### Bump dependencies

- [#663](https://github.com/Azure/typespec-azure/pull/663) Upgrade dependencies

### Breaking Changes

- [#521](https://github.com/Azure/typespec-azure/pull/521) Switching ProvisioningState from enum to Open union


## 0.41.0

### Bug Fixes

- [#392](https://github.com/Azure/typespec-azure/pull/392) Fix `@lroStatus` not detecting default states correctly when using union
- [#498](https://github.com/Azure/typespec-azure/pull/498) `no-enum` rule codefix now convert to named variant when the enum had not values (e.g. `enum E {a, b}`)
- [#549](https://github.com/Azure/typespec-azure/pull/549) Remove readOnly from nextLink in templates (#418)
- [#462](https://github.com/Azure/typespec-azure/pull/462) Update `property-name-conflict` linter rule to stop looking and recommending `@projectedName` in favor of `@clientName`

### Bump dependencies

- [#437](https://github.com/Azure/typespec-azure/pull/437) Update dependencies

### Features

- [#407](https://github.com/Azure/typespec-azure/pull/407) Adding new `armResourceIdentifier` scalar to represent an Arm ID
- [#505](https://github.com/Azure/typespec-azure/pull/505) Enable `no-closed-literal` linter rule by default in `all` ruleset
- [#467](https://github.com/Azure/typespec-azure/pull/467) Enable `no-enum` rule by default in `all` ruleset


## 0.40.0

### Bug Fixes

- [#231](https://github.com/Azure/typespec-azure/pull/231) Azure `Page` type `nextLink` properties are now marked as `readonly`
- [#258](https://github.com/Azure/typespec-azure/pull/258) Implement code fixes for `no-enum` linter rule

### Bump dependencies

- [#243](https://github.com/Azure/typespec-azure/pull/243) Update dependencies

### Features

- [#341](https://github.com/Azure/typespec-azure/pull/341) Add new `azureLocation` scalar


## 0.39.1

### Patch Changes

- 9baadd2: Allow to define lroStatus on a union type
- 9baadd2: `no-enum` linter rule allows the `Version` enum.


## 0.39.0

### Patch Changes

- @typespec/compiler@0.53.0
- @typespec/http@0.53.0
- @typespec/rest@0.53.0


## 0.38.0

Wed, 24 Jan 2024 05:47:19 GMT

### Minor changes

- Update dependencies.

### Updates

- Relaxing camelCase linting rule to allow a single non-alphabetical char. Also added standard filterParameter
- Renamed template parameters for clarity and consistency.
- Update dependencies

## 0.37.2

Wed, 20 Dec 2023 05:29:22 GMT

### Patches

- Add LRO support for ARM patterns

## 0.37.1

Mon, 11 Dec 2023 18:44:34 GMT

### Patches

- Give a name to the `RepeatabilityResult` union

## 0.37.0

Wed, 06 Dec 2023 19:47:28 GMT

### Minor changes

- Update dependencies.

### Updates

- Add `finalResult`, `finalEnvelopeResult` and `finalLogicalPath` to `LroMetadata` interface.
- Add `no-enum` rule to discourage use of raw enums in favor of unions.
- Add EmbeddingVector model.
- Added new helper `getUnionAsEnum` to try to convert a union of literal to a enum like type
- Fix #3725 inconsistent logicalPath in getLroMetadata
- Fix #3724 final-state-via for custom put

## 0.36.0

Wed, 08 Nov 2023 00:11:02 GMT

### Minor changes

- Update dependencies.

### Updates

- Add new linter rules warning against misused of inheritance and composition. Warn when extending a model without a discriminator or alternatively when composing a model with a discriminator.
- **BREAKING CHANGE**: OperationState.InProgress renamed to OperationState.Running. Added OperationState.NotStarted.
- Fixed issue where `getLroMetadata` did not always return the correct `logicalResult` when the final location was a `ResourceLocation`.
- Fix #3745 correct property validation for lroResult and lroErrorResult
- `TypeScript` use `types` entry under `exports` of `package.json` instead of legacy `typesVersions` to provide the definition files
- **BREAKING CHANGE** Minimum node version increased to 18

## 0.35.1

Sat, 28 Oct 2023 15:59:07 GMT

### Patches

- Fix #3745 correct property validation for lroResult and lroErrorResult

## 0.35.0

Wed, 11 Oct 2023 23:51:36 GMT

### Updates

- Fix issue where calling `createLroMetadata` could crash when an incomplete LRO specification was provided.
- Migrate 'friendly-name' rule from typespec-code-generator-core to typespec-azure-core.
- **Breaking** Fix parameter order of `Azure.Core.Foundations.GetOperationStatus`
- **Breaking Change** When an interface based on `ResourceOperations` is created, a unique diagnostic will now be raised for each missing required trait. This may require new suppressions to be added to existing specifications.
- Update dependencies
- Uptake changes to http libraries with status code ranges

## 0.34.0

Tue, 12 Sep 2023 21:49:08 GMT

### Minor changes

- Update dependencies.

### Updates

- Migrating linter rules to new system. Linter rules will NOT be automatically enabled anymore.
  Add the following to your `tspconfig.yaml` to get the same behavior:

```yaml
linter:
  extends: ["@azure-tools/typespec-azure-core/all"]
```

- **Deprecation** Paging metadata provide a new segments array to resolve `items` and `nextLink` path. Old `itemsPath` and `nextLinkPath` are deprecated as they cannot be used when a property name has a `.`.
- Fix issue where conditional request header only appeared on GET operations.
- Properties inside of a trait envelope model can now have their own `@traitContext` decorator which overrides that of the trait envelope property. This enables finer granularity for where trait properties can be applied.
- Extend linter rule set from `@typespec/http` library
- Fix #2964, Fix #2637, Fix #3410 LRO improvements and tests
- Update `ResourceOperations.ResourceCreateOrUpdate` and `ResourceOperations.LongRunningResourceCreateOrUpdate` templates to work properly with parameters that have "create" visibility.
- Fix to allow RpcOperation and LongRunningRpcOperation work with Traits.

## 0.33.1

Fri, 11 Aug 2023 21:58:00 GMT

### Patches

- Fix #3393 Status Monitor for createOrReplaceAsync template

## 0.33.0

Tue, 08 Aug 2023 22:32:22 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix #3299 Add lro metadata and update PUT lro template
- Add `@friendlyName` on `CustomPage`
- Fix LRO status header property detection for `Location` headers

## 0.32.0

Tue, 11 Jul 2023 22:06:14 GMT

### Minor changes

- Update dependencies.

### Updates

- Add `@dev` on doc comment to prevent it overriding template doc
- Linter rule: Use standard names for operations.
- Linter rule: Ensure non-204 response have a response body and 204 responses do not.
- Linter rule: Ensure RPCOperations marked with `@get` or `@delete` don't have request bodies.
- Linter rule: Require `@useAuth` decorator on Azure services.
- Linter rule: Discourage overriding the HTTP verb on standard operations.
- Linter rule: Discourage custom 4xx and 5xx responses.
- Fix #2862 and issues with custom LROs for RPC operations
- Update dependencies

## 0.31.0

Tue, 06 Jun 2023 22:44:32 GMT

### Minor changes

- Update dependencies.

### Updates

- **Potential breaking change** Add missing decorators signature.
- Make Azure.Core.Foundations.Error.details and Azure.Core.Foundations.InnerError.code properties optional in accordance with the REST API guidelines.
- Add LongRunningRpcOperation operation template.
- Require documentation on enums and enum members.
- **Added** new linter rule `known-encoding` verifying the use of known encoding with `@encode`
- Add new scalars `uuid`, `ipV4Address`, `ipV6Address` and `eTag`
- **Deprecation** The original resource operation signatures in Azure.Core have now been deprecated in favor of the new ResourceOperations interface. See this documentation page for instructions on using the new pattern: https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05
- Remove deprecation of v1 Azure.Core operation templates
- Add better type constraints in Azure.Core operations and models with TypeSpec.Reflection.Model in places where unions or other types might be invalid.
- Add `no-explicit-routes-resource-ops` linting rule to discourage the use of @route on standard resource operations
- Add `isResourceOperation` function to determine if an operation is a resource operation from Azure.Core
- `New Linting Rule`: Add `no-rpc-path-params` linting rule to warn against using path parameters in RpcOperations
- Remove reference to `object` in decorators and templates
- Updated decorators to use `valueof`
- Added validation for `@pollingOperation` decorator checking it can only be applied to operation returning a model or union of models

## 0.30.1

Tue, 16 May 2023 19:41:25 GMT

### Patches

- Fix: `no-operation-id` rule requiring `openapi` package to be installed

## 0.30.0

Wed, 10 May 2023 21:24:14 GMT

### Minor changes

- Update dependencies.

### Updates

- **Added** new `operation-missing-api-version` linting rule for operations in versioned namespaces.
- Add linter rules for operation names.
- Fix issue with LongRunningResourceCreateWithServiceProvidedName.
- Add warning if operation has multiple non-error status codes with different schemas.
- Add linter warning if property name is the same as its enclosing model in a case-insensitive manner.
- Add warning if `OpenAPI.operationId` decorator is used in Azure specs, as it should not be required.
- Add linter warning if orderBy is used as a parameter to list operations.
- Add linter warning if request body is a raw array type.
- Update SkipQueryParameter default to 0.
- **Added** new `byos` linting rule, warning against storage management
- **Added** linter rule recommending to use `csv` for query and header collection format.
- [Linter] Added new rule against using fixed enum as discriminator
- **Added** new linting rule discouraging use of nullable properties
- **Added** new `no-object` linting rule warning against usage of `object` type
- **Added** linting rule discouraging use of `offsetDateTime`
- Add trait properties to parameters and response of `RpcOperation`
- Cleanup deprecated items
- `byos` rule doesn't report twice on `op is` referencing a template instance

## 0.29.0

Tue, 11 Apr 2023 18:49:21 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix CreateOrReplace Lro teamplate and test issues
- Change `@azure-tools\typespec-azure-core\no-unknown` diagnostic from error to warning.
- Suppress diagnostics in getLroMetadate execution
- Add a `TErrorResponse` template parameter to `RpcOperation` to make the error response type customizable
- Add versioning support to standard Azure.Core traits via the `traitAdded` decorator
- Uptake breaking change to `@query` and `@header` decorator
- Uptake changes to datetime types

## 0.28.1

Mon, 27 Mar 2023 22:31:25 GMT

### Patches

- Ignore diagnostics in getLroMetadata #2673

## 0.28.0

Mon, 13 Mar 2023 21:30:57 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix issue where TResource could cause conflicts with Azure.Core operation status templates.
- Add lroHelper and update template lro links
- Change require-key-visibility diagnostic to warning

## 0.27.0

Fri, 03 Mar 2023 19:59:30 GMT

### Minor changes

- Update dependencies.

### Updates

- Add linter rules for additionalProperties usage.
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

- Fix issue where getPagedResult doesn't work on extended paged types.
- Fix issue where getPagedResult did not work for intersected models.
- Add linter rule to prevent multiple discriminators in class hierarchies.
- Add `x-ms-error-code` response header for standard Error model.
- The error response type in standard Azure.Core operations can now be customized.
- Removes `@client`, `@clientDefinition` and `@returnsSubclient` decorators. Removed `getClientItems`, `getClientDefinition`, `getClientDefinitions`, `getReturnedSubclient`, `gatherOperations` and `getClientOperations` functions. Removed `ClientDefinition` interface. Removed Subclient<TSubclient> operation template.
- Fix issues when multiple copies of library are loaded.

## 0.25.0

Fri, 13 Jan 2023 00:05:37 GMT

### Minor changes

- Add `require-key-visibility` linting rule
- Update dependencies.
- Added new service traits implementation for customizing all resource lifecycle operations via trait types passed to an interface
- Streamline Azure.Core operation signatures so that the original resource type is used as the body type for lifecycle operations
- Bump Azure.Core library version to v1.0-preview.2

## 0.24.0

Wed, 07 Dec 2022 17:21:54 GMT

### Minor changes

- Uptake new `getNamespaceFullName`
- **Deprecate** `@client` and `@clientDefinition` decorators in favor of "@azure-tools/cadl-dpg" library alternative
- Refactor standard action operations to use `@actionSeparator` instead of `@segmentSeparator`.
- Update dependencies.
- Added `@fixed` decorator for enums where are not extensible.
- Uptake change to compiler for new `scalar` type

### Patches

- Fix casing style check
- Add linting rules to prohibit `unknown` property types and warn against using `@format`.
- Add linter rule to discourage use of `@fixed` enums.
- Update dependencies

### Updates

- Update test cases

## 0.9.0

Sat, 12 Nov 2022 00:14:23 GMT

### Minor changes

- Add `ClientRequestIdHeader` and `RequestIdResponseHeader` customization mixins to enable tracking of client and server request IDs in operations.
- Update dependencies.
- Add `RpcOperation` signature to define non-Resource RPC operations
- Update templates TResource to constraint to object
- Uptake changes to linter engine

### Patches

- Add `casing` linter rule to check casing style of various syntax element names
- Fix: `documentation-required` diagnostic show up at the correct location for model properties
- Add the ResourceUpdate operation

### Updates

- Documentation change

## 0.8.0

Wed, 12 Oct 2022 21:12:48 GMT

### Minor changes

- Add a linting rule to verify that long-running operations have a `@pollingOperation` decorator applied
- Update dependencies.
- Apply changes to rest library

### Patches

- Add `documentation-required` linting rule to verify that models and operations in specs have `@doc` strings
- Add customization types for conditional and repeatable requests
- Add model types providing standard list operation query parameter definitions
- Added reusable operation status polling signatures like `GetOperationStatus` and `GetResourceOperationStatus<TResource>`
- Add documentation and example for how to create a singleton resource

### Updates

- Update readme on template url

## 0.7.0

Thu, 08 Sep 2022 01:05:13 GMT

### Minor changes

- Remove @cadl-lang/openapi as a dependency
- Improve the design of standard operation shapes and add linting rules for enforcement
- Update dependencies.
- React to Type suffix removal
- Uptake change to enum members map type

### Patches

- Ensure getPagedResult works with ResourceList template operations.
- Internal: Remove unnecessary, duplicate import

## 0.6.0

Thu, 11 Aug 2022 19:05:47 GMT

### Minor changes

- Move standard lifecycle operations into Azure.Core namespace, add Foundations namespace for low-level building blocks
- Add TCustom parameter to enable customization of standard resource operation signatures
- Add initial versioning support for Azure.Core library
- Add support for defining service clients and subclient accessors using @client, @clientDefinition, and Subclient<T>
- Allow getPagedResult to be called on an operation or model.
- Add @nextPageOperation.
- Add support for operationLinks.
- Remove @longRunning placeholder decorator.
- Export PagedResultMetadata type.
- React to OkResponse becoming non-generic
- Update dependencies.
- Added custom parameter template to Azure.Core.Operations.ResourceDelete and ResourceRead.

### Patches

- Update README with documentation and examples
- Error type's details property is now typed `Error[]`
- Omit the @key property from create and update operations
- Add LRO state decorators and logic to identify terminal long-running operation states
- Add ResourceLocation<T> usage and operation status monitors for long running operations
- Integrate changes to resource update/replace operation HTTP verbs

### Updates

- Refactoring.

## 0.5.0

Fri, 08 Jul 2022 23:23:14 GMT

### Minor changes

- Add standard lifecycle operation templates for Azure services
- Customizable Page.
- Update dependencies.

### Patches

- Fix buggy Azure.Core namespacing.

## 0.4.0

Mon, 13 Jun 2022 23:42:46 GMT

### Minor changes

- Add @paged decorator.
- Update dependencies.
- Remove @compositeHost in favor of @server decorator from @cadl-lang/rest library
- Uptake changes to decorator context

### Patches

- Add simple @longRunning and @host decorators.
- add retry-after header

## 0.3.0

Fri, 06 May 2022 17:20:15 GMT

### Minor changes

- Update dependencies.
- Remove node 14 support

## 0.2.0

Thu, 31 Mar 2022 17:11:06 GMT

### Minor changes

- Update dependencies.

## 0.1.0

Wed, 09 Mar 2022 17:42:26 GMT

### Minor changes

- Update dependencies.

### Patches

- Introduce new Azure.Core library, @azure-tools/cadl-azure-core
