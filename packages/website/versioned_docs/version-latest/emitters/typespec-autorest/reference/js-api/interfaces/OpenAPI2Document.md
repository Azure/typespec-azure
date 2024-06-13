---
jsApi: true
title: "[I] OpenAPI2Document"

---
## Extends

- [`Extensions`](../type-aliases/Extensions.md)

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `consumes?` | `string`[] | A list of MIME types the APIs can consume. This is global to all APIs but can be overridden on specific API calls |
| `definitions?` | `Record`<`string`, [`OpenAPI2Schema`](../type-aliases/OpenAPI2Schema.md)\> | Data types that can be consumed and produced by operations |
| `externalDocs?` | [`OpenAPI2ExternalDocs`](OpenAPI2ExternalDocs.md) | Additional external documentation. |
| `host?` | `string` | The host (name or ip) serving the API. This MUST be the host only and does not include the scheme nor sub-paths. It MAY include a port. If the host is not included, the host serving the documentation is to be used (including the port). The host does not support path templating. |
| `info` | [`OpenAPI2Info`](OpenAPI2Info.md) | Provides metadata about the API. The metadata can be used by the clients if needed. |
| `parameters?` | `Record`<`string`, [`OpenAPI2Parameter`](../type-aliases/OpenAPI2Parameter.md)\> | parameters that can be used across operations |
| `paths` | `Record`<`string`, [`OpenAPI2PathItem`](../type-aliases/OpenAPI2PathItem.md)\> | The available paths and operations for the API |
| `produces?` | `string`[] | A list of MIME types the APIs can produce. This is global to all APIs but can be overridden on specific API calls |
| `schemes?` | `string`[] | The transfer protocol of the API. Values MUST be from the list: "http", "https", "ws", "wss". |
| `security?` | [`OpenAPI2SecurityRequirement`](../type-aliases/OpenAPI2SecurityRequirement.md)[] | A declaration of which security schemes are applied for the API as a whole. The list of values describes alternative security schemes that can be used (that is, there is a logical OR between the security requirements). Individual operations can override this definition |
| `securityDefinitions?` | `Record`<`string`, [`OpenAPI2SecurityScheme`](../type-aliases/OpenAPI2SecurityScheme.md)\> | Security scheme definitions that can be used across the specification |
| `swagger` | `"2.0"` | - |
| `tags?` | [`OpenAPI2Tag`](OpenAPI2Tag.md)[] | A list of tags used by the specification with additional metadata. The order of the tags can be used to reflect on their order by the parsing tools. Not all tags that are used by the Operation Object must be declared. The tags that are not declared may be organized randomly or based on the tools' logic. Each tag name in the list MUST be unique. |
| `x-ms-parameterized-host?` | [`XMSParameterizedHost`](XMSParameterizedHost.md) | When used, replaces the standard OpenAPI "host" attribute with a host that contains variables to be replaced as part of method execution or client construction, very similar to how path parameters work. |
| `x-ms-paths?` | `Record`<`string`, [`OpenAPI2PathItem`](../type-aliases/OpenAPI2PathItem.md)\> | <p>Additional paths and operations that cannot be used in `paths` as the url is not unique. This can be used to provide operation overload using a query param.</p><p>**Example**</p><code>"/foo?type=abc" returning FooA and "/foo?type=xyz" returning FooB are not allowed in `paths` as there is query params.</code> |
