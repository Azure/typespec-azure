# Changelog - @azure-tools/typespec-autorest-canonical

## 0.26.0

### Deprecations

- [#3836](https://github.com/Azure/typespec-azure/pull/3836) Deprecate `azure-resource-provider-folder` option.
  
  ```diff lang=yaml
  -azure-resource-provider-folder: "resource-manager"
  -output-file: "{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json"
  +output-file: "resource-manager/{service-name}/{version-status}/{version}/openapi.json"
  ```


## 0.25.0

### Bump dependencies

- [#3677](https://github.com/Azure/typespec-azure/pull/3677) Upgrade dependencies

### Bug Fixes

- [#3622](https://github.com/Azure/typespec-azure/pull/3622) Adapt to shared type changes in typespec-autorest


## 0.24.0

### Bump dependencies

- [#3546](https://github.com/Azure/typespec-azure/pull/3546) Upgrade dependencies


## 0.23.0

### Bump dependencies

- [#3447](https://github.com/Azure/typespec-azure/pull/3447) Upgrade dependencies october 2025


## 0.22.0

### Features

- [#3360](https://github.com/Azure/typespec-azure/pull/3360) Exposed option `xml-strategy` from the base typespec-autorest emitter.


## 0.21.0

### Bump dependencies

- [#3207](https://github.com/Azure/typespec-azure/pull/3207) Upgrade dependencies


## 0.20.0

### Bump dependencies

- [#3029](https://github.com/Azure/typespec-azure/pull/3029) Upgrade dependencies


## 0.19.0

### Bump dependencies

- [#2867](https://github.com/Azure/typespec-azure/pull/2867) Upgrade dependencies


## 0.18.0

No changes, version bump only.

## 0.17.0

No changes, version bump only.

## 0.16.0

No changes, version bump only.

## 0.15.0

### Bump dependencies

- [#2433](https://github.com/Azure/typespec-azure/pull/2433) Upgrade dependencies


## 0.14.0

### Breaking Changes

- [#2309](https://github.com/Azure/typespec-azure/pull/2309) Minimum node version is now 20

### Bump dependencies

- [#2308](https://github.com/Azure/typespec-azure/pull/2308) Update dependencies


## 0.13.0

No changes, version bump only.

## 0.12.0

### Bump dependencies

- [#2109](https://github.com/Azure/typespec-azure/pull/2109) Upgrade dependencies


## 0.11.0

No changes, version bump only.

## 0.10.0

### Bug Fixes

- [#1950](https://github.com/Azure/typespec-azure/pull/1950) Update lockfile for core changes


## 0.9.0

### Bump dependencies

- [#1663](https://github.com/Azure/typespec-azure/pull/1663) Upgrade dependencies


## 0.8.0

### Bump dependencies

- [#1534](https://github.com/Azure/typespec-azure/pull/1534) Bump dependencies


## 0.7.0

No changes, version bump only.

## 0.6.0

### Bug Fixes

- [#1279](https://github.com/Azure/typespec-azure/pull/1279) fix the included versions value in typespec-autorest-canonical emitter

### Bump dependencies

- [#1219](https://github.com/Azure/typespec-azure/pull/1219) Update dependencies


## 0.5.1

### Features

- [#1237](https://github.com/Azure/typespec-azure/pull/1237) Use new `createTcgcContext` from tcgc lib, which is the minimal context object that handles scope


## 0.5.0

### Bug Fixes

- [#1065](https://github.com/Azure/typespec-azure/pull/1065) set option "use-read-only-status-schema" to true to fix ProvisioningStateMustBeReadOnly bug; 
add isArmCommonType check to avoid decorator validation in canonical emitter
- [#1065](https://github.com/Azure/typespec-azure/pull/1065) update the canonical swagger file folder name

### Bump dependencies

- [#1104](https://github.com/Azure/typespec-azure/pull/1104) Dependency updates July 2024


## 0.4.0

### Bug Fixes

- [#968](https://github.com/Azure/typespec-azure/pull/968) update the canonical swagger file folder name

### Bump dependencies

- [#867](https://github.com/Azure/typespec-azure/pull/867) Update dependencies - May 2024


## 0.3.0

### Bug Fixes

- [#765](https://github.com/Azure/typespec-azure/pull/765) Refactor to make use ot autorest emitter logic to compute the types
- [#293](https://github.com/Azure/typespec-azure/pull/293) Add support for new `@body`, `@bodyRoot` and `@bodyIgnore`

### Bump dependencies

- [#663](https://github.com/Azure/typespec-azure/pull/663) Upgrade dependencies

### Features

- [#671](https://github.com/Azure/typespec-azure/pull/671) Add resolveRef logic for the typespec-autorest-canonical emitter


## 0.2.1

### Bug Fixes

- [#568](https://github.com/Azure/typespec-azure/pull/568) Small performance improvements




## 0.2.0

No changes, version bump only.
