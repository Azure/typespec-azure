---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<object, Record<string, any>, never>;
```

## Type declaration

| Name | Type | Default value |
| ------ | ------ | ------ |
| `arm-common-types-incompatible-version` | `object` | - |
| `arm-common-types-incompatible-version.default` | `CallableMessage`<[`"selectedVersion"`, `"supportedVersions"`]\> | - |
| `arm-common-types-invalid-version` | `object` | - |
| `arm-common-types-invalid-version.default` | `CallableMessage`<[`"versionString"`, `"supportedVersions"`]\> | - |
| `arm-resource-circular-ancestry` | `object` | - |
| `arm-resource-circular-ancestry.default` | "There is a loop in the ancestry of this resource. Please ensure that the \`@parentResource\` decorator contains the correct parent resource, and that parentage contains no cycles." | "There is a loop in the ancestry of this resource. Please ensure that the \`@parentResource\` decorator contains the correct parent resource, and that parentage contains no cycles." |
| `arm-resource-duplicate-base-parameter` | `object` | - |
| `arm-resource-duplicate-base-parameter.default` | "Only one base parameter type is allowed per resource. Each resource may have only one of \`@parentResource\`, \`@resourceGroupResource\`, \`@tenantResource\`, \`@locationResource\`, or \`@subscriptionResource\` decorators." | "Only one base parameter type is allowed per resource. Each resource may have only one of \`@parentResource\`, \`@resourceGroupResource\`, \`@tenantResource\`, \`@locationResource\`, or \`@subscriptionResource\` decorators." |
| `arm-resource-invalid-base-type` | `object` | - |
| `arm-resource-invalid-base-type.default` | `"The @armResourceInternal decorator can only be used on a type that ultimately extends TrackedResource, ProxyResource, or ExtensionResource."` | "The @armResourceInternal decorator can only be used on a type that ultimately extends TrackedResource, ProxyResource, or ExtensionResource." |
| `arm-resource-missing` | `object` | - |
| `arm-resource-missing.default` | `CallableMessage`<[`"type"`]\> | - |
| `arm-resource-missing-arm-namespace` | `object` | - |
| `arm-resource-missing-arm-namespace.default` | `"The @armProviderNamespace decorator must be used to define the ARM namespace of the service. This is best applied to the file-level namespace."` | "The @armProviderNamespace decorator must be used to define the ARM namespace of the service. This is best applied to the file-level namespace." |
| `arm-resource-missing-name-key-decorator` | `object` | - |
| `arm-resource-missing-name-key-decorator.default` | `"Resource type 'name' property must have a @key decorator which defines its key name."` | "Resource type 'name' property must have a @key decorator which defines its key name." |
| `arm-resource-missing-name-property` | `object` | - |
| `arm-resource-missing-name-property.default` | `"Resource types must include a string property called 'name'."` | "Resource types must include a string property called 'name'." |
| `arm-resource-missing-name-segment-decorator` | `object` | - |
| `arm-resource-missing-name-segment-decorator.default` | `"Resource type 'name' property must have a @segment decorator which defines its path fragment."` | "Resource type 'name' property must have a @segment decorator which defines its path fragment." |
| `decorator-in-namespace` | `object` | - |
| `decorator-in-namespace.default` | `CallableMessage`<[`"decoratorName"`]\> | - |
| `decorator-param-wrong-type` | `object` | - |
| `decorator-param-wrong-type.armUpdateProviderNamespace` | `"The parameter to @armUpdateProviderNamespace must be an operation with a 'provider' parameter."` | "The parameter to @armUpdateProviderNamespace must be an operation with a 'provider' parameter." |
| `parent-type` | `object` | - |
| `parent-type.notResourceType` | `CallableMessage`<[`"parent"`, `"type"`]\> | - |
| `resource-without-path-and-segment` | `object` | - |
| `resource-without-path-and-segment.default` | "Resource types must have a property with '@path\` and '@segment' decorators." | "Resource types must have a property with '@path\` and '@segment' decorators." |
| `single-arm-provider` | `object` | - |
| `single-arm-provider.default` | `"Only one @armProviderNamespace can be declared in a typespec spec at once."` | "Only one @armProviderNamespace can be declared in a typespec spec at once." |
| `template-type-constraint-no-met` | `object` | - |
| `template-type-constraint-no-met.default` | `CallableMessage`<[`"sourceType"`, `"entity"`, `"constraintType"`, `"actionMessage"`]\> | - |
