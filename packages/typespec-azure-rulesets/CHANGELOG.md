# Changelog - @azure-tools/typespec-azure-rulesets

## 0.71.0

### Features

- [#4867](https://github.com/Azure/typespec-azure/pull/4867) Add `csharp-model-suffix` and `csharp-use-standard-acronyms` linter rules for C# SDK model naming.
- [#5109](https://github.com/Azure/typespec-azure/pull/5109) Add `no-openapi-client-extensions` linter rule that flags use of the `@typespec/openapi` `@extension` decorator to emit client-altering `x-ms-*`/`x-nullable` OpenAPI extensions (e.g. `x-ms-long-running-operation`, `x-ms-pageable`, `x-ms-enum`, `x-ms-client-name`, `x-ms-secret`). These extensions only affect the OpenAPI output, so other emitters produce an incorrect representation of the API; use the equivalent TypeSpec construct instead.
- [#4892](https://github.com/Azure/typespec-azure/pull/4892) Add the experimental Relationship base type for Azure Resource Manager extension resources. `RelationshipProperties` provides the `baseTypes` descriptor, source and target resource and tenant identifiers, and provisioning state. Resource providers can extend this property bag with relationship-specific information and expose the relationship against any ARM resource scope.
  
  Example of creating a dependency relationship with RP-specific metadata and operations:
  
  ```typespec
  using Azure.ResourceManager;
  using Azure.ResourceManager.BaseTypes.Relationships;
  
  model DependencyOfMetadata {
    sourceType: string;
    targetType: string;
    description?: string;
  }
  
  model DependencyOfProperties is RelationshipProperties {
    metadata: DependencyOfMetadata;
  }
  
  #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
  model DependencyOf is Relationship<DependencyOfProperties> {
    ...ResourceNameParameter<
      Resource = DependencyOf,
      KeyName = "relationshipName",
      SegmentName = "dependencyOf",
      NamePattern = "^[a-zA-Z0-9_.-]{1,64}$"
    >;
  }
  
  interface DependencyOfOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
    get is Extension.Read<Scope, DependencyOf>;
    create is Extension.CreateOrReplaceAsync<Scope, DependencyOf>;
    update is Extension.CustomPatchAsync<
      Scope,
      DependencyOf,
      Azure.ResourceManager.Foundations.ResourceUpdateModel<DependencyOf, DependencyOfProperties>
    >;
    delete is Extension.DeleteWithoutOkAsync<Scope, DependencyOf>;
    list is Extension.ListByTarget<Scope, DependencyOf>;
  }
  ```
- [#4808](https://github.com/Azure/typespec-azure/pull/4808) Split `arm-resource-operation` lint rule: add `use-operation-decorator`, `use-api-version`, and `use-interface` as separate rules replacing the original combined rule.
- [#4880](https://github.com/Azure/typespec-azure/pull/4880) Replace the `no-unnamed-union` linter rule with `no-unnamed-types` in `@azure-tools/typespec-azure-core`. The new rule flags anonymous models in addition to unnamed unions, walking the type graph from operations to detect anonymous models on the client surface. The `no-unnamed-types` rule has been removed from `@azure-tools/typespec-client-generator-core`.


## 0.70.0

### Features

- [#4842](https://github.com/Azure/typespec-azure/pull/4842) Add `no-reserved-resource-property` linter rule that flags reserved property names (matched case-insensitively, e.g. `billingData`) present in an ARM resource's property bag. The reserved-name list and diagnostic reason are extensible.
- [#4541](https://github.com/Azure/typespec-azure/pull/4541) Add a new `client-sdk` ruleset and enable the `csharp-no-url-suffix` rule in it. The rule applies only to specs configured to emit a client SDK, i.e. those that extend `@azure-tools/typespec-azure-rulesets/client-sdk` in their `tspconfig.yaml`.
- [#4664](https://github.com/Azure/typespec-azure/pull/4664) Add `@featureFile`, `@featureFiles`, and `@featureFileOptions` decorators in `Azure.ResourceManager` namespace as alternatives to the Legacy `@feature`, `@features`, and `@featureOptions` decorators. Add `arm-feature-file-usage-discourage` linting rule. Fix `arm-custom-resource-usage-discourage` rule to propagate suppressions from model templates to their instantiations.


## 0.69.2

### Features

- [111845d](https://github.com/Azure/typespec-azure/commit/111845d46f5cbd3c32b39f7fc89a05c2f6f7908c) Add a new `client-sdk` ruleset and enable the `csharp-no-url-suffix` rule in it. The rule applies only to specs configured to emit a client SDK, i.e. those that extend `@azure-tools/typespec-azure-rulesets/client-sdk` in their `tspconfig.yaml`.


## 0.69.1

### Bug Fixes

- [#4621](https://github.com/Azure/typespec-azure/pull/4621) Adding Azure Resource Manager Base Types, including the Agent base type.
  
  Base types provide structured constraints for resources including required and optional
  properties in their RP-specific property bags. The `@azureBaseType` decorator attaches
  base type metadata to resource models for validation.
  
  Example of creating an Agent resource:
  
  ```typespec
  using Azure.ResourceManager;
  using Azure.ResourceManager.BaseTypes;
  using Azure.ResourceManager.BaseTypes.Agents;
  
  model MyDefinition is AgentDefinitionPlatform<true, true> {}
  
  model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
    ...DefaultProvisioningStateProperty;
  }
  
  model MyAgent is Agent<MyAgentProperties> {
    ...ResourceNameParameter<MyAgent>;
  }
  
  model MyConversationProperties is ConversationProperties {
    ...DefaultProvisioningStateProperty;
  }
  
  model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
    ...ResourceNameParameter<MyConversation>;
  }
  
  model MyResponseProperties is ResponseProperties {
    ...DefaultProvisioningStateProperty;
  }
  
  model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
    ...ResourceNameParameter<MyResponse>;
  }
  ```


## 0.69.0

### Features

- [#4384](https://github.com/Azure/typespec-azure/pull/4384) Add new linting rule `no-override-props` that warns when a model redefines a property that is already defined in one of its base models. The 'name' property of an ARM resource and properties redefined as part of a model marked with `@discriminator` are not flagged by this rule.


## 0.68.0

### Features

- [#4347](https://github.com/Azure/typespec-azure/pull/4347) Add new `version-progression` linter rule that validates ARM service versions all use unique dates and are declared in strictly increasing chronological order. Two api-versions sharing the same `YYYY-MM-DD` date (for example, `2026-04-28` and `2026-04-28-preview`) are not allowed.
- [#4379](https://github.com/Azure/typespec-azure/pull/4379) Add new linter rule `arm-no-path-casing-conflicts` that flags ARM operation paths which differ only by character casing. The rule is enabled in the `@azure-tools/typespec-azure-rulesets` resource-manager ruleset.
- [#4144](https://github.com/Azure/typespec-azure/pull/4144) Add `no-route-parameter-name-mismatch` linting rule that detects when two operation routes differ only by path parameter name.


## 0.67.0

No changes, version bump only.

## 0.65.1

### Bump dependencies

- [#3986](https://github.com/Azure/typespec-azure/pull/3986) Upgrade dependencies


## 0.65.0

No changes, version bump only.

## 0.64.0

### Bump dependencies

- [#3677](https://github.com/Azure/typespec-azure/pull/3677) Upgrade dependencies


## 0.63.0

### Features

- [#3475](https://github.com/Azure/typespec-azure/pull/3475) Add new `no-case-mismatch` rule checking for types with names only differing by case

### Bump dependencies

- [#3546](https://github.com/Azure/typespec-azure/pull/3546) Upgrade dependencies

### Bug Fixes

- [#3483](https://github.com/Azure/typespec-azure/pull/3483) Add new `no-unnamed-union` rule to prevent usage of unnamed unions in Azure


## 0.62.0

### Features

- [#3411](https://github.com/Azure/typespec-azure/pull/3411) Add `@azure-tools/typespec-azure-resource-manager/secret-prop` rule to `resource-manager` ruleset

### Bump dependencies

- [#3447](https://github.com/Azure/typespec-azure/pull/3447) Upgrade dependencies october 2025

### Bug Fixes

- [#3350](https://github.com/Azure/typespec-azure/pull/3350) Disable `retry-after` rule in arm ruleset which was a noop


## 0.61.0

No changes, version bump only.

## 0.60.0

### Bump dependencies

- [#3207](https://github.com/Azure/typespec-azure/pull/3207) Upgrade dependencies


## 0.59.0

### Bump dependencies

- [#3029](https://github.com/Azure/typespec-azure/pull/3029) Upgrade dependencies


## 0.58.0

### Bump dependencies

- [#2867](https://github.com/Azure/typespec-azure/pull/2867) Upgrade dependencies


## 0.57.1

### Bug Fixes

- [#2897](https://github.com/Azure/typespec-azure/pull/2897) Added a linter rule to warn when a `@Azure.ResourceManager.Legacy.customAzureResource` does not contain a `@key` property, as this can cause duplicate operations.


## 0.57.0

No changes, version bump only.

## 0.56.1

### Bug Fixes

- [#2675](https://github.com/Azure/typespec-azure/pull/2675) Discourage use of legacy types outside brownfield conversions


## 0.56.0

No changes, version bump only.

## 0.55.0

No changes, version bump only.

## 0.54.0

### Features

- [#2396](https://github.com/Azure/typespec-azure/pull/2396) add `no-legacy-usage` rule to rules list

### Bump dependencies

- [#2433](https://github.com/Azure/typespec-azure/pull/2433) Upgrade dependencies


## 0.53.0

### Breaking Changes

- [#2309](https://github.com/Azure/typespec-azure/pull/2309) Minimum node version is now 20

### Deprecations

- [#2349](https://github.com/Azure/typespec-azure/pull/2349) `@azure-tools/typespec-azure-core/prefer-csv-collection-format` rule has been replaced by `@azure-tools/typespec-azure-core/no-header-explode` rule.

### Features

- [#1208](https://github.com/Azure/typespec-azure/pull/1208) add some tcgc rules to the list

### Bump dependencies

- [#2308](https://github.com/Azure/typespec-azure/pull/2308) Update dependencies


## 0.52.0

No changes, version bump only.

## 0.51.0

### Bump dependencies

- [#2109](https://github.com/Azure/typespec-azure/pull/2109) Upgrade dependencies


## 0.50.0

No changes, version bump only.

## 0.49.0

### Bug Fixes

- [#1950](https://github.com/Azure/typespec-azure/pull/1950) Update lockfile for core changes

### Features

- [#1923](https://github.com/Azure/typespec-azure/pull/1923) Discourage usage of new decorator `@Azure.ResourceManager.Legacy.customAzureResource`
- [#1740](https://github.com/Azure/typespec-azure/pull/1740) Update the `arm no-response-body` rule to behave similarly to the core rule, but with the additional requirement that the 202 response can and should also be empty


## 0.48.0

### Bug Fixes

- [#1545](https://github.com/Azure/typespec-azure/pull/1545) Disable `@azure-tools/typespec-azure-core/standard-names` for `resource-manager` ruleset. Rule was already excluding ARM operations automatically this just configure the ruleset correctly

### Bump dependencies

- [#1663](https://github.com/Azure/typespec-azure/pull/1663) Upgrade dependencies


## 0.47.0

### Bump dependencies

- [#1534](https://github.com/Azure/typespec-azure/pull/1534) Bump dependencies

### Features

- [#1555](https://github.com/Azure/typespec-azure/pull/1555) Add `no-empty-model` rule to ruleset


## 0.46.0

### Bug Fixes

- [#1357](https://github.com/Azure/typespec-azure/pull/1357) Disable `use-standard-operations` azure core linter rule from `resource-manager` ruleset

### Features

- [#1342](https://github.com/Azure/typespec-azure/pull/1342) Replace `no-operation-id` linter rule with a more generic `no-openapi` rule guarding against any use of openapi decorators


## 0.45.0

### Bug Fixes

- [#1154](https://github.com/Azure/typespec-azure/pull/1154) Add `@azure-tools/typespec-azure-core/require-versioned` rule to `data-plane` and `resource-manager` rulesets

### Bump dependencies

- [#1219](https://github.com/Azure/typespec-azure/pull/1219) Update dependencies

### Features

- [#1194](https://github.com/Azure/typespec-azure/pull/1194) Add `friendly-name` rule to `data-plane` and `resource-manager` rulesets
- [#1193](https://github.com/Azure/typespec-azure/pull/1193) Add new `no-private-usage` linter rule to `data-plane` and `resource-manager` rulesets


## 0.44.0

### Bug Fixes

- [#927](https://github.com/Azure/typespec-azure/pull/927) Add rule `@azure-tools/typespec-azure-core/friendly-name` to `data-plane` and `resource-manager` rulesets

### Bump dependencies

- [#1104](https://github.com/Azure/typespec-azure/pull/1104) Dependency updates July 2024


## 0.43.0

### Bug Fixes

- [#905](https://github.com/Azure/typespec-azure/pull/905) Add `tspMain` for playground bundling




## 0.42.1

### Bug Fixes

- [#897](https://github.com/Azure/typespec-azure/pull/897) Remove `@azure-tools/typespec-azure-core/non-breaking-versioning` from rulesets

