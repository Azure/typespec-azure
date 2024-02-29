# @azure-tools/typespec-client-generator-core

TypeSpec Data Plane Generation library

## Install

```bash
npm install @azure-tools/typespec-client-generator-core
```

## Decorators

### Azure.ClientGenerator.Core

- [`@access`](#@access)
- [`@client`](#@client)
- [`@clientFormat`](#@clientformat)
- [`@clientName`](#@clientname)
- [`@convenientAPI`](#@convenientapi)
- [`@exclude`](#@exclude)
- [`@flattenProperty`](#@flattenproperty)
- [`@include`](#@include)
- [`@internal`](#@internal)
- [`@operationGroup`](#@operationgroup)
- [`@protocolAPI`](#@protocolapi)
- [`@usage`](#@usage)

#### `@access`

Set access for operations, models and enums. All models that are only used in operations with access "internal" will be implicitly set to access "internal".

```typespec
@Azure.ClientGenerator.Core.access(value: EnumMember, scope?: valueof string)
```

##### Target

`Model | Operation | Enum`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| value | `EnumMember`     | The access info you want to set for this model or operation.                                                  |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@access(Access.internal)
model ModelToHide {
prop: valueof string
}
@access(Access.internal)
op test: void;
```

#### `@client`

Create a ClientGenerator.Core client out of a namespace or interface

```typespec
@Azure.ClientGenerator.Core.client(value?: {}, scope?: valueof string)
```

##### Target

`Namespace | Interface`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| value | `{}`             | Optional configuration for the service.                                                                       |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

###### Basic client setting

```typespec
@client
namespace MyService {

}
```

###### Setting with other service

```typespec
namespace MyService {

}

@client({
  service: MyService,
})
interface MyInterface {}
```

###### Changing client name if you don't want <Interface/Namespace>Client

```typespec
@client({
  client: MySpecialClient,
})
interface MyInterface {}
```

#### `@clientFormat`

Can be used to explain the client type that the current TYPESPEC
type should map to.

```typespec
@Azure.ClientGenerator.Core.clientFormat(value: valueof "unixtime" | "iso8601" | "rfc1123" | "seconds")
```

##### Target

`ModelProperty`

##### Parameters

| Name  | Type                                                        | Description                 |
| ----- | ----------------------------------------------------------- | --------------------------- |
| value | `valueof "unixtime" \| "iso8601" \| "rfc1123" \| "seconds"` | The client format to apply. |

##### Examples

```typespec
model MyModel {
  @clientFormat("unixtime")
  created_at?: int64;
}
```

#### `@clientName`

Changes the name of a method, parameter, property, or model generated in the client SDK

```typespec
@Azure.ClientGenerator.Core.clientName(rename: valueof string, scope?: valueof string)
```

##### Target

`unknown`

##### Parameters

| Name   | Type             | Description                                                                                                   |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| rename | `valueof string` | The rename you want applied to the object                                                                     |
| scope  | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@clientName("nameInClient")
op nameInService: void;
```

```typespec
@clientName("nameForJava", "java")
@clientName("name_for_python", "python")
@clientName("nameForCsharp", "csharp")
@clientName("nameForJavascript", "javascript")
op nameInService: void;
```

#### `@convenientAPI`

Whether you want to generate an operation as a convenient operation.

```typespec
@Azure.ClientGenerator.Core.convenientAPI(value?: valueof boolean, scope?: valueof string)
```

##### Target

`Operation`

##### Parameters

| Name  | Type              | Description                                                                                                   |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| value | `valueof boolean` | Whether to generate the operation as convenience method or not.                                               |
| scope | `valueof string`  | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@convenientAPI(false)
op test: void;
```

#### `@exclude`

Whether to exclude a model from generation for specific languages. By default we generate
all models that are included in operations.

```typespec
@Azure.ClientGenerator.Core.exclude(scope?: valueof string)
```

##### Target

`Model`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@exclude("python")
model ModelToExclude {
  prop: valueof string;
}
```

#### `@flattenProperty`

Set whether a model property should be flattened or not.

```typespec
@Azure.ClientGenerator.Core.flattenProperty(scope?: valueof string)
```

##### Target

`ModelProperty`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
model Foo {
  @flattenProperty
  prop: Bar;
}
model Bar {}
```

#### `@include`

Whether to include a model in generation for specific languages. By default we generate
all models that are included in operations.

```typespec
@Azure.ClientGenerator.Core.include(scope?: valueof string)
```

##### Target

`Model`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@include("python")
model ModelToInclude {
  prop: valueof string;
}
```

#### `@internal`

Whether to mark an operation as internal for specific languages,
meaning it should not be exposed to end SDK users

```typespec
@Azure.ClientGenerator.Core.internal(scope?: valueof string)
```

##### Target

`Operation`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@internal("python")
op test: void;
```

#### `@operationGroup`

Create a ClientGenerator.Core operation group out of a namespace or interface

```typespec
@Azure.ClientGenerator.Core.operationGroup(scope?: valueof string)
```

##### Target

`Namespace | Interface`

##### Parameters

| Name  | Type             | Description                                                                                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| scope | `valueof string` | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@operationGroup
interface MyInterface {}
```

#### `@protocolAPI`

Whether you want to generate an operation as a protocol operation.

```typespec
@Azure.ClientGenerator.Core.protocolAPI(value?: valueof boolean, scope?: valueof string)
```

##### Target

`Operation`

##### Parameters

| Name  | Type              | Description                                                                                                   |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| value | `valueof boolean` | Whether to generate the operation as protocol or not.                                                         |
| scope | `valueof string`  | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@protocolAPI(false)
op test: void;
```

#### `@usage`

Expand usage for models/enums. A model's default usage info is always calculated by the operations that use it.
You could use this decorator to expand the default usage info. (e.g. append Usage.input by

```typespec
@Azure.ClientGenerator.Core.usage(value: EnumMember | Union, scope?: valueof string)
```

##### Target

`Model | Enum`

##### Parameters

| Name  | Type                  | Description                                                                                                   |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| value | `EnumMember \| Union` | The usage info you want to set for this model.                                                                |
| scope | `valueof string`      | The language scope you want this decorator to apply to. If not specified, will apply to all language emitters |

##### Examples

```typespec
@usage(Usage.input | Usage.output)
model InputAndOutPutModel {
  prop: string;
}
```
