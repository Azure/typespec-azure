# TCGC Package Knowledge Base

## Decorators

### Client & Hierarchy

| Decorator               | Target                     | Purpose                                                              |
| ----------------------- | -------------------------- | -------------------------------------------------------------------- |
| `@client`               | Namespace \| Interface     | Define root or nested clients with service binding                   |
| `@operationGroup`       | Namespace \| Interface     | **Deprecated** — alias for `@client`, use `@client` instead          |
| `@clientLocation`       | Operation \| ModelProperty | Move operations between clients or elevate parameters to client init |
| `@clientInitialization` | Namespace \| Interface     | Customize client initialization parameters and strategy              |
| `@paramAlias`           | ModelProperty              | Alias parameter names between client init and operation level        |

### Naming & Namespace

| Decorator          | Target                                           | Purpose                                      |
| ------------------ | ------------------------------------------------ | -------------------------------------------- |
| `@clientName`      | any                                              | Override generated name (highest precedence) |
| `@clientNamespace` | Namespace \| Interface \| Model \| Enum \| Union | Change namespace for client or type          |

### Access & Usage

| Decorator | Target                                                            | Purpose                                                 |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| `@access` | ModelProperty \| Model \| Operation \| Enum \| Union \| Namespace | Set visibility: `Access.public` or `Access.internal`    |
| `@usage`  | Model \| Enum \| Union \| Namespace                               | Add usage flags: `Usage.input`, `output`, `json`, `xml` |
| `@scope`  | Operation \| ModelProperty                                        | Limit element to specific language emitters             |

### API Generation

| Decorator         | Target                              | Purpose                                  |
| ----------------- | ----------------------------------- | ---------------------------------------- |
| `@convenientAPI`  | Operation \| Namespace \| Interface | Toggle convenience method generation     |
| `@protocolAPI`    | Operation \| Namespace \| Interface | Toggle protocol method generation        |
| `@responseAsBool` | Operation                           | Model HEAD operation as `Response<bool>` |

### Serialization & Types

| Decorator                       | Target                                            | Purpose                                      |
| ------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| `@alternateType`                | ModelProperty \| Scalar \| Model \| Enum \| Union | Replace type with alternate or external type |
| `@useSystemTextJsonConverter`   | Model                                             | Mark for custom JSON converter (C# compat)   |
| `@deserializeEmptyStringAsNull` | ModelProperty                                     | Deserialize empty strings as null            |

### Versioning & Parameters

| Decorator            | Target        | Purpose                                                  |
| -------------------- | ------------- | -------------------------------------------------------- |
| `@apiVersion`        | ModelProperty | Mark/unmark parameter as API version                     |
| `@clientApiVersions` | Namespace     | Extend client API version enum without full `@versioned` |

### Documentation & Options

| Decorator       | Target | Purpose                                    |
| --------------- | ------ | ------------------------------------------ |
| `@clientDoc`    | any    | Override documentation with append/replace |
| `@clientOption` | any    | Pass experimental options to emitters      |

### Legacy Decorators (`Azure.ClientGenerator.Core.Legacy`)

| Decorator             | Target        | Purpose                                           |
| --------------------- | ------------- | ------------------------------------------------- |
| `@flattenProperty`    | ModelProperty | Flatten nested property (not recommended)         |
| `@markAsLro`          | Operation     | Force operation as LRO                            |
| `@markAsPageable`     | Operation     | Force operation as pageable                       |
| `@disablePageable`    | Operation     | Disable paging for pageable operations            |
| `@nextLinkVerb`       | Operation     | Specify HTTP verb (GET/POST) for next-link paging |
| `@clientDefaultValue` | ModelProperty | Set client-level default value (brownfield only)  |
| `@hierarchyBuilding`  | Model         | Multi-level discriminator inheritance             |

### Transformation Functions (Experimental)

| Function            | Purpose                     |
| ------------------- | --------------------------- |
| `replaceParameter`  | Replace operation parameter |
| `removeParameter`   | Remove optional parameter   |
| `addParameter`      | Add new parameter           |
| `reorderParameters` | Reorder parameters          |

## Enums

| Enum                | Values                                                |
| ------------------- | ----------------------------------------------------- |
| `Usage`             | `input` (2), `output` (4), `json` (256), `xml` (512)  |
| `Access`            | `public`, `internal`                                  |
| `InitializedBy`     | `individually` (1), `parent` (2), `customizeCode` (4) |
| `DocumentationMode` | `append`, `replace`                                   |

## Public Types (Key)

| Type                          | Kind                 | Purpose                             |
| ----------------------------- | -------------------- | ----------------------------------- |
| `SdkPackage`                  | package              | Root package with clients and types |
| `SdkClientType`               | client               | Client with methods and init params |
| `SdkClientInitializationType` | clientinitialization | Client initialization configuration |
| `SdkBasicServiceMethod`       | basic                | Standard service method             |
| `SdkPagingServiceMethod`      | paging               | Paging method with metadata         |
| `SdkLroServiceMethod`         | lro                  | Long-running operation method       |
| `SdkLroPagingServiceMethod`   | lropaging            | Combined LRO + paging method        |
| `SdkHttpOperation`            | http                 | HTTP operation details              |
| `SdkModelType`                | model                | Model/class type                    |
| `SdkEnumType`                 | enum                 | Enumeration type                    |
| `SdkUnionType`                | union                | Union type                          |
| `SdkBuiltInType`              | (various)            | Built-in scalar types               |

## Key Interface Properties

### SdkClientInitializationType

- `kind: "clientinitialization"`
- `name: string`
- `isGeneratedName: boolean`
- `parameters: (SdkEndpointParameter | SdkCredentialParameter | SdkMethodParameter)[]`
- `initializedBy: InitializedByFlags`

Note: The property is `parameters` (not `properties`).

### SdkBasicServiceMethod

- Inherits from `SdkServiceMethodBase`
- `kind: "basic"`
- Error response is `exception?: SdkMethodResponse` (singular, optional — not `exceptions`)

## Feature-to-Doc Mapping

| Feature Area              | Howto Doc                   | Spector Spec                                                  |
| ------------------------- | --------------------------- | ------------------------------------------------------------- |
| Client hierarchy          | 03client.mdx                | client/structure/                                             |
| Client initialization     | 03client.mdx                | azure/client-generator-core/client-initialization/            |
| Methods & signatures      | 04method.mdx                | —                                                             |
| Paging                    | 05pagingOperations.mdx      | azure/core/page/, azure/payload/pageable/                     |
| LRO                       | 06longRunningOperations.mdx | azure/core/lro/                                               |
| Multipart                 | 07multipart.mdx             | —                                                             |
| Types                     | 08types.mdx                 | azure/client-generator-core/usage/                            |
| Renaming                  | 09renaming.mdx              | client/naming/                                                |
| Versioning                | 10versioning.mdx            | azure/client-generator-core/api-version/                      |
| Hierarchy building        | 11hierarchyBuilding.mdx     | azure/client-generator-core/hierarchy-building/               |
| Client options            | 12clientOptions.mdx         | —                                                             |
| Access control            | 04method.mdx                | azure/client-generator-core/access/                           |
| Alternate types           | 08types.mdx                 | azure/client-generator-core/alternate-type/                   |
| Flatten property          | 08types.mdx                 | azure/client-generator-core/flatten-property/                 |
| Scope filtering           | 04method.mdx                | —                                                             |
| HEAD as bool              | 04method.mdx                | —                                                             |
| Client API versions       | 10versioning.mdx            | —                                                             |
| Deserialize empty as null | 08types.mdx                 | azure/client-generator-core/deserialize-empty-string-as-null/ |

## Doc Conventions

- All `<ClientTabs>` blocks must be generated via the @doc-example-generator skill
- Six language tabs: typespec, python, csharp, typescript, java, go
- Legacy decorators marked with `:::caution` admonitions
- File naming: numbered prefix (00-12) + camelCase feature name + .mdx
- Client customizations in separate `client.tsp` file, imported from `main.tsp`
- Howto docs use frontmatter with `sidebar` object containing `label` and `position`

## Test File Paths

| Feature                       | Test File                                                |
| ----------------------------- | -------------------------------------------------------- |
| @access                       | test/decorators/access.test.ts                           |
| @alternateType                | test/decorators/alternate-type.test.ts                   |
| @apiVersion                   | test/decorators/api-version.test.ts                      |
| @client                       | test/decorators/client.test.ts                           |
| @clientInitialization         | test/decorators/client-initialization.test.ts            |
| @clientLocation               | test/decorators/client-location.test.ts                  |
| @clientName                   | test/decorators/client-name.test.ts                      |
| @clientNamespace              | test/decorators/client-namespace.test.ts                 |
| @clientOption                 | test/decorators/client-option.test.ts                    |
| @clientDoc                    | test/decorators/client-doc.test.ts                       |
| @convenientAPI                | test/decorators/convenient-api.test.ts                   |
| @deserializeEmptyStringAsNull | test/decorators/deserialize-empty-string-as-null.test.ts |
| @flattenProperty              | test/decorators/flatten-property.test.ts                 |
| @override                     | test/decorators/override.test.ts                         |
| @paramAlias                   | test/decorators/param-alias.test.ts                      |
| @protocolAPI                  | test/decorators/protocol-api.test.ts                     |
| @responseAsBool               | test/decorators/response-as-bool.test.ts                 |
| @scope                        | test/decorators/scope.test.ts                            |
| @usage                        | test/decorators/usage.test.ts                            |
| Client structure              | test/clients/structure.test.ts                           |
| Paging                        | test/methods/paged-operation.test.ts                     |
| LRO                           | test/methods/lro.test.ts                                 |
| Model types                   | test/types/model.test.ts                                 |
| Union types                   | test/types/union.test.ts                                 |
| Enum types                    | test/types/enum.test.ts                                  |
