# @azure-tools/typespec-metadata

## 0.1.2

Java package name now includes the Maven groupId prefix based on flavor and management/data plane.
The format is `{groupId}:{artifactId}` where groupId is:
- `com.azure` for data-plane libraries (default)
- `com.azure.resourcemanager` for management-plane (ARM) libraries
- `com.azure.v2` for data-plane libraries with `flavor: azurev2`
- `com.azure.resourcemanager.v2` for management-plane libraries with `flavor: azurev2`

## 0.1.1

### Bump dependencies

- [#3986](https://github.com/Azure/typespec-azure/pull/3986) Upgrade dependencies

### Bug Fixes

- [#3992](https://github.com/Azure/typespec-azure/pull/3992) Ensure unrecognized emitter names use the full emitter name as the language key. Adds support for C# HTTP client emitters.


## 0.1.0 (TBD)

Initial release

- Initial implementation of TypeSpec metadata emitter
- Support for YAML and JSON output formats
- Generates structured metadata for APIView and other tooling
