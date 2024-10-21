# Change Log - @azure-tools/typespec-azure-resource-manager

## 0.47.1

### Bug Fixes

- [#1673](https://github.com/Azure/typespec-azure/pull/1673) Fix `ArmProviderActionAsync` to correctly return 202 responses.


## 0.47.0

### Bug Fixes

- [#1416](https://github.com/Azure/typespec-azure/pull/1416) Fix #1180 Return StatusMonitor result field for non-resource PUT operations in getLroMetadata.finalResult
- [#1551](https://github.com/Azure/typespec-azure/pull/1551) Correct ManagedServiceIdentityType versioning issue
- [#1537](https://github.com/Azure/typespec-azure/pull/1537) Fix missing-x-ms-identifier rule not checking base class for properties

### Bump dependencies

- [#1534](https://github.com/Azure/typespec-azure/pull/1534) Bump dependencies

### Features

- [#1639](https://github.com/Azure/typespec-azure/pull/1639) Adding `ArmProviderActionSync` and `ArmProviderActionAsync` templates to the ARM library to perform actions at the subscription and tenant levels.
- [#1512](https://github.com/Azure/typespec-azure/pull/1512) `x-ms-skip-url-encoding` should be replaced with `allowReserved`
- [#1505](https://github.com/Azure/typespec-azure/pull/1505) Added common-types managed identity with delegation and network security perimeter
- [#1555](https://github.com/Azure/typespec-azure/pull/1555) Add `no-empty-model` rule


## 0.46.1

### Bug Fixes

- [#1512](https://github.com/Azure/typespec-azure/pull/1512) `x-ms-skip-url-encoding` should be replaced with `allowReserved`


## 0.46.0

### Bug Fixes

- [#1359](https://github.com/Azure/typespec-azure/pull/1359) `arm-no-record` rule should warn about any use of `Record<X>` not just when inside resource properties

### Features

- [#1482](https://github.com/Azure/typespec-azure/pull/1482) Add mobo type to TypeSpec-Azure common types


## 0.45.0

### Bug Fixes

- [#1187](https://github.com/Azure/typespec-azure/pull/1187) Replace deprecated LocationParameter with LocationResourceParameter

### Bump dependencies

- [#1219](https://github.com/Azure/typespec-azure/pull/1219) Update dependencies


## 0.44.0

### Bug Fixes

- [#1166](https://github.com/Azure/typespec-azure/pull/1166) Fix #1048 Allow void in final result for Azure-AsyncOperation header
- [#1156](https://github.com/Azure/typespec-azure/pull/1156) Minor fix to make foundations and common-type more consistent.
- [#1102](https://github.com/Azure/typespec-azure/pull/1102) Fixing typo
- [#1139](https://github.com/Azure/typespec-azure/pull/1139) LocationResourceParameter should be azureLocation instead of string
- [#1111](https://github.com/Azure/typespec-azure/pull/1111) Fix the type discrepancy issue for property userAssignedIdentities in common types V5 ManagedServiceIdentity
- [#927](https://github.com/Azure/typespec-azure/pull/927) Remove explicit `all` rulesets
- [#1081](https://github.com/Azure/typespec-azure/pull/1081) Fix ArmResourcePatch templates and incorporate common-types updates
- [#1144](https://github.com/Azure/typespec-azure/pull/1144) Tweak regex to validate Arm keys

### Bump dependencies

- [#1104](https://github.com/Azure/typespec-azure/pull/1104) Dependency updates July 2024

### Features

- [#1116](https://github.com/Azure/typespec-azure/pull/1116) Link CommonTypes enums and unions to the swagger common types
- [#1161](https://github.com/Azure/typespec-azure/pull/1161) Added an optional template parameter on `TrackedResource`, `ProxyResource`, and `ExtensionResource` ARM templates that allows brownfield services to customize the optionality of the ARM resource `properties` field.
- [#1123](https://github.com/Azure/typespec-azure/pull/1123) Removed direct reference to OpenAPI extension `x-ms-azure-resource` in ARM library and replaced with `@Azure.ResourceManager.Private.azureResourceBase` decorator. It is only used internally on base resource types. `autorest` emitter has been updated to check the decorator and still emit `x-ms-azure-resource` extension in swagger.

### Breaking Changes

- [#1093](https://github.com/Azure/typespec-azure/pull/1093) Removing $armRenameListByOperation decorator so operation id is directly derived from operation name. Previously operation id is statically resolved and fixed :

- For top level resources, `[Resource]_ListByResourceGroup`
- For child resources, `[Resource]_ListBy[ParentResource]`

With this change, the operation name will form the second part of the operation id, just like other ARM operation templates.

```diff
-list is ArmResourceListByParent<Employee>;
+listByLocation is ArmResourceListByParent<Employee>;
```

You can modify the operation name to match existing spec to avoid breaking changes.
- [#1146](https://github.com/Azure/typespec-azure/pull/1146) Moved `@armRenameListByOperation` into `Azure.ResourceManager.Private` namespace. Adding back original listByParent doc resolution logic to keep swagger changes to minimal.
- [#1105](https://github.com/Azure/typespec-azure/pull/1105) `x-ms-client-flatten` extension on some of resource properties property is now configurable to be emitted by autorest emitter. Default is false which will skip emission of that extension.


## 0.43.0

### Bug Fixes

- [#998](https://github.com/Azure/typespec-azure/pull/998) Adding legacy v4 ManagedServiceIdentity model to avoid breaking changes in specs with mixed v3 and v4 common type reference
- [#955](https://github.com/Azure/typespec-azure/pull/955) Remove OpenAPI dependencies from ARM LRO templates and test LRO overrides
- [#929](https://github.com/Azure/typespec-azure/pull/929) Adding an overload parameter to ResourceNameParameter that allows `name` type to be set to string union type.
- [#860](https://github.com/Azure/typespec-azure/pull/860) Fix `percentComplete` property on `OperationStatus` should be a float not an int
- [#979](https://github.com/Azure/typespec-azure/pull/979) Make Resource Properties Bag Updatable

### Bump dependencies

- [#867](https://github.com/Azure/typespec-azure/pull/867) Update dependencies - May 2024

### Features

- [#811](https://github.com/Azure/typespec-azure/pull/811) Remove dependency on `typespec-autorest` emitter
- [#432](https://github.com/Azure/typespec-azure/pull/432) Add support for values

## 0.42.1

### Bug Fixes

- [#868](https://github.com/Azure/typespec-azure/pull/868) Changing back `ManagedServiceIdentity.userAssignedIdentities` back to `Record<UserAssignedIdentity`. Adding ARM common-type references for on all Managed Identity models.

## 0.42.0

### Bug Fixes

- [#605](https://github.com/Azure/typespec-azure/pull/605) Specify the fully qualified name of `@OpenAPI.extension` decorator in `missing-x-ms-identifiers` linter warning.
- [#400](https://github.com/Azure/typespec-azure/pull/400) Updated `ManagedIndentity` and `CustomerManagedKey` TypeSpec model definition to be consistent with Swagger commont-types
- [#567](https://github.com/Azure/typespec-azure/pull/567) Enable `arm-common-types-version` rule by default.
- [#751](https://github.com/Azure/typespec-azure/pull/751) Allow `@pattern` to be provided on a scalar
- [#702](https://github.com/Azure/typespec-azure/pull/702) Fix `arm-resource-name-pattern` rule codefix producing invalid syntax
- [#293](https://github.com/Azure/typespec-azure/pull/293) Update to support new meaning of `@body`

### Bump dependencies

- [#663](https://github.com/Azure/typespec-azure/pull/663) Upgrade dependencies

### Features

- [#661](https://github.com/Azure/typespec-azure/pull/661) Fixing ArmResource base model and add an easier way to define Resource Name parameter
- [#736](https://github.com/Azure/typespec-azure/pull/736) Adding standard ExtendedLocation definition for ARM library

### Deprecations

- [#762](https://github.com/Azure/typespec-azure/pull/762) Renaming internal TypeSpec ARM foundation model names to be consistent with ARM common-type definitions.
  However, these are `Azure.Resource.Manager.Foundations` models that would not normally be used directly in service specs.

- Deprecate `Foundations.ArmResource`. `Foundations.Resource` should be used instead.

- Deprecate `Foundations.ResourceSkuType`. `Foundations.Sku` should be used instead.

- Deprecate `Foundations.ResourcePlanType`. `Foundations.Plan` should be used instead.

- Deprecate `Foundations.TrackedResourceBase`. `Foundations.TrackedResource` should be used instead.

- Deprecate `Foundations.ProxyResourceBase`. `Foundations.ProxyResource` should be used instead.

- Deprecate `Foundations.ExtensionResourceBase`. `Foundations.ExtensionResource` should be used instead.
- [#768](https://github.com/Azure/typespec-azure/pull/768) Standardizing mix-in model names with consistent `Property` suffix.

- Deprecate `ManagedServiceIdentity`. `ManagedServiceIdentityProperty` should be used instead.

  Example:

  ```diff
  -...ManagedServiceIdentity;
  +...ManagedServiceIdentityProperty;
  ```

- Deprecate `ManagedSystemAssignedIdentity`. `ManagedSystemAssignedIdentityProperty` should be used instead.

  Example:

  ```diff
  -...ManagedSystemAssignedIdentity;
  +...ManagedSystemAssignedIdentityProperty;
  ```

- Deprecate `EntityTag`. `EntityTagProperty` should be used instead.

  Example:

  ```diff
  -...EntityTag;
  +...EntityTagProperty;
  ```

- Deprecate `ResourceKind`. `ResourceKindProperty` should be used instead.

  Example:

  ```diff
  -...ResourceKind;
  +...ResourceKindProperty;
  ```

- Deprecate `ResourcePlan`. `ResourcePlanProperty` should be used instead.

  Example:

  ```diff
  -...ResourcePlan;
  +...ResourcePlanProperty;
  ```

- Deprecate `ResourceSku`. `ResourceSkuProperty` should be used instead.

  Example:

  ```diff
  -...ResourceSku;
  +...ResourceSkuProperty;
  ```

- Deprecate `ManagedBy`. `ManagedByProperty` should be used instead.

  Example:

  ```diff
  -...ManagedBy;
  +...ManagedByProperty;
  ```

### Breaking Changes

- [#521](https://github.com/Azure/typespec-azure/pull/521) Switching ProvisioningState from enum to Open union

## 0.41.0

### Bug Fixes

- [#410](https://github.com/Azure/typespec-azure/pull/410) Fixing ArmDeleteLroResponse missing Retry-After header

### Bump dependencies

- [#437](https://github.com/Azure/typespec-azure/pull/437) Update dependencies

### Features

- [376](https://github.com/Azure/typespec-azure/pull/376) `RetryAfter` header was moved to be in the default `LroHeaders` for LRO operations. If you were overriding the `LroHeaders` template parmater previously you might need to add `& Azure.Core.FoundationsRetryAfterHeader`
- [#495](https://github.com/Azure/typespec-azure/pull/495) Made `delegatedIdentityClientId` optional `CustomerManagedKeyEncryption` to align with the common types definition.
- [#514](https://github.com/Azure/typespec-azure/pull/514) Add `lro-location-header` rule.
- [#369](https://github.com/Azure/typespec-azure/pull/369) Add `arm-put-operation-response-codes` and `arm-post-operation-response-codes` rules.
- [#359](https://github.com/Azure/typespec-azure/pull/359) ARM: add `arm-resource-name-pattern` rule to allow disabling LintDiff `ResourceNamePattern` rule

### Deprecations

- [#407](https://github.com/Azure/typespec-azure/pull/407) Deprecate `ResourceIdentifier` in favor of new `Azure.Core.armResourceIdentifier`

## 0.40.0

### Bug Fixes

- [#323](https://github.com/Azure/typespec-azure/pull/323) Adding `@visibility("read")` & optional linting rules linting rules for ARM `provisioningState`
- [#366](https://github.com/Azure/typespec-azure/pull/366) Fix for issue #254 cannot customize response in ARM PUT templates

### Bump dependencies

- [#243](https://github.com/Azure/typespec-azure/pull/243) Update dependencies

### Features

- [#304](https://github.com/Azure/typespec-azure/pull/304) Add `arm-no-record` rule.
- [#283](https://github.com/Azure/typespec-azure/pull/283) Added `ArmResourceHead` operation template
- [#298](https://github.com/Azure/typespec-azure/pull/298) ARM: add `arm-delete-response-codes` rule.
- [#317](https://github.com/Azure/typespec-azure/pull/317) Add ruleset `canonical-versioning` to Azure Resource Manager library.

## 0.39.1

### Patch Changes

- `arm-resource-provisioning-state` works with unions

## 0.39.0

### Patch Changes

- ebfe639: Fix Location resource issue, add mechanism for additional path segments
- 148eee4: Update references to ARM, Add template customization parameters, add migration docs

## 0.38.0

Wed, 24 Jan 2024 05:47:19 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix: Resolve selected arm common version when used on version enum members
- Renamed template parameters for clarity and consistency.
- Update dependencies

## 0.37.1

Wed, 20 Dec 2023 05:29:22 GMT

### Patches

- Add types to support lro scenarios

## 0.37.0

Wed, 06 Dec 2023 19:47:28 GMT

### Minor changes

- Update dependencies.

### Updates

- Added support for the SubscriptionLifeCycleNotification endpoint

## 0.36.1

Tue, 14 Nov 2023 20:35:54 GMT

### Patches

- Adding allowing void on ARM action templates to specify no request body.

## 0.36.0

Wed, 08 Nov 2023 00:11:02 GMT

### Minor changes

- Update dependencies.

### Updates

- ARM `common-types` versions can now be selected for each service specification version using the `Azure.ResourceManager.CommonTypes.Versions` enum with the new `@armCommonTypesVersion` decorator
- Add support for Private Links v5 common types
- Add ARM v5 common-types for Customer Managed Keys
- `TypeScript` use `types` entry under `exports` of `package.json` instead of legacy `typesVersions` to provide the definition files
- **BREAKING CHANGE** Minimum node version increased to 18

## 0.35.0

Wed, 11 Oct 2023 23:51:36 GMT

### Updates

- Update dependencies
- Uptake changes to http libraries with status code ranges

## 0.34.0

Tue, 12 Sep 2023 21:49:08 GMT

### Minor changes

- Update dependencies.

### Updates

- Soft deprecation of ArmResourceActionNoCOntentAsync in favor of ArmResourceActionNoResponseCOntentAsync
- Migrating linter rules to new system. Linter rules will NOT be automatically enabled anymore.
  Add the following to your `tspconfig.yaml` to get the same behavior:

```yaml
linter:
  extends: ["@azure-tools/typespec-azure-resource-manager/all"]
```

- Add Private links common types to Azure.ResourceManager

## 0.33.0

Tue, 08 Aug 2023 22:32:23 GMT

### Minor changes

- Update dependencies.

### Updates

- Allow shared ARM type libraries and override of arm provider namespace
- Fix #3243 issues with ArmTagsPatch template parameters
- Fix #3316, #3325, arm template issues
- Add fix and tests for ArmTagsPatchAsync

## 0.32.0

Tue, 11 Jul 2023 22:06:14 GMT

### Minor changes

- Update dependencies.

### Patches

- Updated LocationParameter to reference Common Types

### Updates

- Add ArmResourceDeleteWithoutOkAsync operation signature to comply with updated ARM guidelines
- Add ArmResourceActionNoResponseContentAsync operation signature
- Add `@dev` on doc comment to prevent it overriding template doc
- Fix generated route for localCheckNameAvailability.
- Update dependencies

## 0.31.0

Tue, 06 Jun 2023 22:44:32 GMT

### Minor changes

- Update dependencies.

### Updates

- **Potential breaking change** Add missing decorators signature
- **Potential breaking change** Moved many decorators in the private namespace. Those are decorators that were not documented and should NOT have been used directly. See `lib/private.decorators.tsp` for list.
- Remove reference to `object` in decorators and templates
- Updated decorators to use `valueof`

## 0.30.0

Wed, 10 May 2023 21:24:14 GMT

### Minor changes

- Update dependencies.

### Updates

- Added templates for checkNameAVailability
- Fix issue where a decorator renames operations in a way that is contrary to guidelines.
- **Added** Support for the new autorest `arm-types-dir` option
- Fix issue with overriding interface lifecycle operations
- Cleanup deprecated items
- Uptake change in template operations

## 0.29.0

Tue, 11 Apr 2023 18:49:21 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix invalid default for ResourceIdentifier Allowed resources
- Uptake changes to datetime types

## 0.28.0

Mon, 13 Mar 2023 21:30:57 GMT

### Minor changes

- Update dependencies.

### Updates

- Correct lro templates for correct generation

## 0.27.0

Fri, 03 Mar 2023 19:59:30 GMT

### Minor changes

- Update dependencies.

### Updates

- Fix arm-resource-invalid-version-format lint rule
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

- Deprecating ResourceOperations to avoid name clash #2476
- Removed `@armNamespace` decorator. Removed `TenantResourceList`, `ResourceCommonParameters`, `ExtensionResourceCommonParameters` and `CommonTenantScope` Cadl models.
- Fix issues when multiple copies of library are loaded.

## 0.25.0

Fri, 13 Jan 2023 00:05:37 GMT

### Minor changes

- Update dependencies.

### Updates

- Internal: Update TS module resolution to node16

## 0.24.0

Wed, 07 Dec 2022 17:21:54 GMT

### Breaking changes

- Update linter rule to account for new pattern of extensible enums.

### Minor changes

- Add lego bricks and linting rules, refactor for operation templates
- Uptake new `getNamespaceFullName`
- Add linter rule to discourage use of `@segment` with `@armResourceAction`.
- Update dependencies.
- Add validation to prevent multiple `@armProviderNamespace`
- Uptake change to compiler for new `scalar` type

### Patches

- Refactor non-direct used ARM library artifacts into Foundations namespace
- Fix api-version query parameter casing style
- add arm lint rule to check armResource<Op> decorator
- add arm lint rule to check response schema consistency
- Update dependencies

## 0.12.0

Sat, 12 Nov 2022 00:14:23 GMT

### Minor changes

- Update dependencies.
- Update templates TResource to constraint to object
- Uptake changes to linter engine

### Patches

- Adding ResourceIdentifier model definition
- Moved `casing` linter rule to `cadl-azure-core`
- Added lint rule to check empty updateable properties
- Opt out of inapplicable metadata to payload on resource types

### Updates

- Consolidate ExtensionResourceOperation to Instance and Collection sub-interface.

## 0.11.0

Wed, 12 Oct 2022 21:12:48 GMT

### Minor changes

- Update linter rules to use new linter system
- Update dependencies.
- **Breaking** `Azure.ResourceManager.Operations` must now be explicitly included.
- Apply changes to rest library

## 0.10.0

Thu, 08 Sep 2022 01:05:13 GMT

### Minor changes

- Rename @armNamespace to @armProviderNamespace, subscriptionId->subscriptionIdParameter, resourceGroup->ResourceGroupParameter, all operations to camelCase, Moving @armCommonDefinition, @armCommonParameter, @assignProviderNamespace, @armUpdateProviderNamespace to internal private namespace
- Internals: Uptake change to `@autoRoute` decorator
- Update dependencies.
- React to Type suffix removal
- Added RPC linting rules and made properties bag optional
- Uptake change to enum members map type
- Uptake changes to compiler with current projection

### Patches

- Fix: service authentication contains correct description for `user_impersonation` scope
- Temporarily disable the use-standard-operations linting rule for ARM specs

## 0.9.0

Thu, 11 Aug 2022 19:05:47 GMT

### Minor changes

- Add initial versioning support for Azure.Core library and use versioned Azure.Core library
- Support set of unannotated parameters as request body
- Add additional unsupported types to linter.
- Reach to OkResponse becomeing non-generic
- Update dependencies.
- Add versioning support for Azure.ResourceManager library and use versioned Azure.Core library
- Uptake changes to type relations

### Patches

- React to changes in Azure.Core namespace organization
- Remove deprecation suppressions and @pageable annotations.
- Suppress deprecation warnings.
- Fix ordering of templated types in ResourceUpdateModel to resolve duplicate model property issues

## 0.8.0

Fri, 08 Jul 2022 23:23:14 GMT

### Minor changes

- Update dependencies.
- Add tenant resource support and tests
- Use new emitter options syntax

## 0.7.0

Mon, 13 Jun 2022 23:42:46 GMT

### Minor changes

- Uptake changes to accessor diagnostics
- Update `ListBy<Parent>` operation name to use parent model name instead of collection name.
- Update dependencies.
- Use @server decorator to set host instead of @serviceHost
- Uptake changes to decorator context

### Patches

- Fix common type error and update to v3 and v4 common types
- add lint rules to apply ARM guideline
- resource name should be marked with @path and visibility("read")

### Updates

- Upgrade to TS4.7

## 0.6.0

Fri, 06 May 2022 17:20:15 GMT

### Minor changes

- Add new `@singleton` decorator to mark an ARM resource type as a singleton resource
- Uptake `mixes` -> `extends` rename
- Add validation to prevent usage of `int8`
- Update dependencies.
- Remove node 14 support
- Rename ResourceListByResourceGroup<T> to ResourceListByParent<T> and automatically rename the contained operation to include the parent type name, if any
- Include updateable resource envelope properties in ResourceUpdateModel

### Patches

- Add a corrected diagnostic for when @armResourceInternal is used on a non-resource type

### Updates

- Adding test cases

## 0.5.0

Thu, 31 Mar 2022 17:11:06 GMT

### Minor changes

- Update dependencies.

### Patches

- Add APIs for requesting all ARM resource types and operations, new decorators for marking ARM operations

## 0.4.0

Wed, 09 Mar 2022 17:42:26 GMT

### Minor changes

- Add interface-based ARM resource modelling pattern
- Use new Azure.Core library and adapt to Page<T> moving over to it
- React to @key decorator move to core
- Update dependencies.

### Patches

- Remove redundant `@visibility` decorators in arm.cadl

## 0.3.0

Tue, 15 Feb 2022 22:35:13 GMT

### Minor changes

- Update dependencies.

### Patches

- Use `@error` instead of no-longer-supported "default" `@statusCode`

## 0.2.0

Fri, 11 Feb 2022 06:13:30 GMT

### Minor changes

- Update decorators with new interface
- Create @azure-tools/cadl-azure-resource-manager library for new interface-based resource modelling design
