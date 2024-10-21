---
jsApi: true
title: "[T] OpenAPI2Schema"

---
```ts
type OpenAPI2Schema: Extensions & object;
```

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `additionalProperties`? | `boolean` \| [`Refable`](Refable.md)<[`OpenAPI2Schema`](OpenAPI2Schema.md)\> | indicates that additional unlisted properties can exist in this schema |
| `allOf`? | [`Refable`](Refable.md)<[`OpenAPI2Schema`](OpenAPI2Schema.md)\>[] | Swagger allows combining and extending model definitions using the allOf property of JSON Schema, in effect offering model composition. allOf takes in an array of object definitions that are validated independently but together compose a single object. While composition offers model extensibility, it does not imply a hierarchy between the models. To support polymorphism, Swagger adds the support of the discriminator field. When used, the discriminator will be the name of the property used to decide which schema definition is used to validate the structure of the model. As such, the discriminator field MUST be a required field. The value of the chosen property has to be the friendly name given to the model under the definitions property. As such, inline schema definitions, which do not have a given id, cannot be used in polymorphism. |
| `default`? | `string` \| `boolean` \| `number` \| `Record`<`string`, `unknown`\> | Declares the value of the property that the server will use if none is provided, for example a "count" to control the number of results per page might default to 100 if not supplied by the client in the request. "default" has no meaning for required parameters.) See https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2. Unlike JSON Schema this value MUST conform to the defined type for this parameter. |
| `description`? | `string` | This attribute is a string that provides a full description of the schema |
| `discriminator`? | `string` | Adds support for polymorphism. The discriminator is the schema property name that is used to differentiate between other schema that inherit this schema. The property name used MUST be defined at this schema and it MUST be in the required property list. When used, the value MUST be the name of this schema or any schema that inherits it. |
| `enum`? | (`string` \| `number` \| `boolean`)[] | Restrict a value to a fixed set of values. It must be an array with at least one element, where each element is unique. |
| `exclusiveMaximum`? | `boolean` | indicates that the maximum is exclusive of the number given |
| `exclusiveMinimum`? | `boolean` | indicates that the minimum is exclusive of the number given |
| `format`? | `string` | The extending format for the previously mentioned type. |
| `items`? | [`Refable`](Refable.md)<[`OpenAPI2Schema`](OpenAPI2Schema.md)\> | Describes the type of items in the array. |
| `maximum`? | `number` | the maximum value for the property if "exclusiveMaximum" is not present, or has boolean value false, then the instance is valid if it is lower than, or equal to, the value of "maximum"; if "exclusiveMaximum" has boolean value true, the instance is valid if it is strictly lower than the value of "maximum". |
| `maxItems`? | `number` | An array instance is valid against "maxItems" if its size is less than, or equal to, the value of this keyword. |
| `maxLength`? | `number` | A string instance is valid against this keyword if its length is less than, or equal to, the value of this keyword. |
| `maxProperties`? | `number` | An object instance is valid against "maxProperties" if its number of properties is less than, or equal to, the value of this keyword. |
| `minimum`? | `number` | the minimum value for the property if "exclusiveMinimum" is not present, or has boolean value false, then the instance is valid if it is greater than, or equal to, the value of "minimum"; if "exclusiveMinimum" has boolean value true, the instance is valid if it is strictly greater than the value of "minimum". |
| `minItems`? | `number` | An array instance is valid against "minItems" if its size is greater than, or equal to, the value of this keyword. |
| `minLength`? | `number` | A string instance is valid against this keyword if its length is greater than, or equal to, the value of this keyword. |
| `minProperties`? | `number` | An object instance is valid against "minProperties" if its number of properties is greater than, or equal to, the value of this keyword. |
| `pattern`? | `string` | A string instance is considered valid if the regular expression matches the instance successfully. |
| `properties`? | `Record`<`string`, [`OpenAPI2SchemaProperty`](OpenAPI2SchemaProperty.md)\> | This attribute is an object with property definitions that define the valid values of instance object property values. When the instance value is an object, the property values of the instance object MUST conform to the property definitions in this object. In this object, each property definition's value MUST be a schema, and the property's name MUST be the name of the instance property that it defines. The instance property value MUST be valid according to the schema from the property definition. Properties are considered unordered, the order of the instance properties MAY be in any order. |
| `readOnly`? | `boolean` | Relevant only for Schema "properties" definitions. Declares the property as "read only". This means that it MAY be sent as part of a response but MUST NOT be sent as part of the request. Properties marked as readOnly being true SHOULD NOT be in the required list of the defined schema. Default value is false. |
| `required`? | `string`[] | A list of property names that are required to be sent from the client to the server. |
| `title`? | `string` | This attribute is a string that provides a short description of the schema. |
| `type`? | [`JsonType`](JsonType.md) | The JSON type for the schema |
| `uniqueItems`? | `boolean` | if this keyword has boolean value false, the instance validates successfully. If it has boolean value true, the instance validates successfully if all of its elements are unique. |
| `x-ms-enum`? | `object` | - |
| `x-ms-enum.modelAsString`? | `boolean` | If the enum should be extensible. |
| `x-ms-enum.name`? | `string` | Name of the enum. |
| `x-ms-enum.values`? | `object`[] | Provide alternative name and description for enum values. |
| `x-ms-mutability`? | `string`[] | - |
