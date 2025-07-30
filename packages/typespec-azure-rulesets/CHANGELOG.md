# Changelog - @azure-tools/typespec-azure-rulesets

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

