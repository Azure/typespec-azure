---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<Object, Record<string, any>, never>;
```

## Type declaration

| Member | Type | Value |
| :------ | :------ | :------ |
| `arm-common-types-incompatible-version` | `Object` | - |
| `arm-common-types-incompatible-version.default` | `CallableMessage`<[`string`, `string`]\> | - |
| `arm-resource-circular-ancestry` | `Object` | - |
| `arm-resource-circular-ancestry.default` | `string` | "There is a loop in the ancestry of this resource.  Please ensure that the \`@parentResource\` decorator contains the correct parent resource, and that parentage contains no cycles." |
| `arm-resource-duplicate-base-parameter` | `Object` | - |
| `arm-resource-duplicate-base-parameter.default` | `string` | "Only one base parameter type is allowed per resource.  Each resource may have only one of \`@parentResource\`, \`@resourceGroupResource\`, \`@tenantResource\`, \`@locationResource\`, or \`@subscriptionResource\` decorators." |
| `arm-resource-invalid-base-type` | `Object` | - |
| `arm-resource-invalid-base-type.default` | `string` | "The @armResourceInternal decorator can only be used on a type that ultimately extends TrackedResource, ProxyResource, or ExtensionResource." |
| `arm-resource-missing` | `Object` | - |
| `arm-resource-missing.default` | `CallableMessage`<[`string`]\> | - |
| `arm-resource-missing-arm-namespace` | `Object` | - |
| `arm-resource-missing-arm-namespace.default` | `string` | "The @armProviderNamespace decorator must be used to define the ARM namespace of the service.  This is best applied to the file-level namespace." |
| `arm-resource-missing-name-key-decorator` | `Object` | - |
| `arm-resource-missing-name-key-decorator.default` | `string` | "Resource type 'name' property must have a @key decorator which defines its key name." |
| `arm-resource-missing-name-property` | `Object` | - |
| `arm-resource-missing-name-property.default` | `string` | "Resource types must include a string property called 'name'." |
| `arm-resource-missing-name-segment-decorator` | `Object` | - |
| `arm-resource-missing-name-segment-decorator.default` | `string` | "Resource type 'name' property must have a @segment decorator which defines its path fragment." |
| `decorator-in-namespace` | `Object` | - |
| `decorator-in-namespace.default` | `CallableMessage`<[`string`]\> | - |
| `decorator-param-wrong-type` | `Object` | - |
| `decorator-param-wrong-type.armUpdateProviderNamespace` | `string` | "The parameter to @armUpdateProviderNamespace must be an operation with a 'provider' parameter." |
| `parent-type` | `Object` | - |
| `parent-type.notResourceType` | `CallableMessage`<[`string`, `string`]\> | - |
| `resource-without-path-and-segment` | `Object` | - |
| `resource-without-path-and-segment.default` | `string` | "Resource types must have a property with '@path\` and '@segment' decorators." |
| `single-arm-provider` | `Object` | - |
| `single-arm-provider.default` | `string` | "Only one @armProviderNamespace can be declared in a typespec spec at once." |
