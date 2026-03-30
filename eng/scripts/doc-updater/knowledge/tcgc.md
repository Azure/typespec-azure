# TCGC Knowledge Base

## Package Info

- **Name:** `@azure-tools/typespec-client-generator-core`
- **TSP namespace:** `Azure.ClientGenerator.Core`
- **Legacy namespace:** `Azure.ClientGenerator.Core.Legacy`

## Decorators (Core)

All decorators support an optional `scope` parameter for language targeting.
Scope patterns: `"python"`, `"python, java"`, `"!csharp"`, `"!(java, python)"`.

| Decorator                       | Target                                                              | Signature                                                                                 |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@clientName`                   | `unknown`                                                           | `(rename: valueof string, scope?: valueof string)`                                        |
| `@convenientAPI`                | `Operation \| Namespace \| Interface`                               | `(flag?: valueof boolean, scope?: valueof string)`                                        |
| `@protocolAPI`                  | `Operation \| Namespace \| Interface`                               | `(flag?: valueof boolean, scope?: valueof string)`                                        |
| `@client`                       | `Namespace \| Interface`                                            | `(options?: ClientOptions, scope?: valueof string)`                                       |
| `@operationGroup`               | `Namespace \| Interface`                                            | `(scope?: valueof string)` — **DEPRECATED**, use `@client`                                |
| `@usage`                        | `Model \| Enum \| Union \| Namespace`                               | `(value: EnumMember \| Union, scope?: valueof string)`                                    |
| `@access`                       | `ModelProperty \| Model \| Operation \| Enum \| Union \| Namespace` | `(value: EnumMember, scope?: valueof string)`                                             |
| `@override`                     | `Operation`                                                         | `(override: Operation, scope?: valueof string)`                                           |
| `@useSystemTextJsonConverter`   | `Model`                                                             | `(scope?: valueof string)` — C# backward compat                                           |
| `@clientInitialization`         | `Namespace \| Interface`                                            | `(options: ClientInitializationOptions, scope?: valueof string)`                          |
| `@paramAlias`                   | `ModelProperty`                                                     | `(paramAlias: valueof string, scope?: valueof string)`                                    |
| `@clientNamespace`              | `Namespace \| Interface \| Model \| Enum \| Union`                  | `(rename: valueof string, scope?: valueof string)`                                        |
| `@alternateType`                | `ModelProperty \| Scalar \| Model \| Enum \| Union`                 | `(alternate: unknown \| ExternalType, scope?: valueof string)`                            |
| `@scope`                        | `Operation \| ModelProperty`                                        | `(scope?: valueof string)`                                                                |
| `@apiVersion`                   | `ModelProperty`                                                     | `(value?: valueof boolean, scope?: valueof string)`                                       |
| `@clientApiVersions`            | `Namespace`                                                         | `(value: Enum, scope?: valueof string)`                                                   |
| `@deserializeEmptyStringAsNull` | `ModelProperty`                                                     | `(scope?: valueof string)`                                                                |
| `@responseAsBool`               | `Operation`                                                         | `(scope?: valueof string)`                                                                |
| `@clientLocation`               | `Operation \| ModelProperty`                                        | `(target: Interface \| Namespace \| Operation \| valueof string, scope?: valueof string)` |
| `@clientDoc`                    | `unknown`                                                           | `(documentation: valueof string, mode: EnumMember, scope?: valueof string)`               |
| `@clientOption`                 | `unknown`                                                           | `(name: valueof string, value: valueof unknown, scope?: valueof string)`                  |

## Decorators (Legacy — `Azure.ClientGenerator.Core.Legacy`)

| Decorator             | Target          | Signature                                                                                      |
| --------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `@flattenProperty`    | `ModelProperty` | `(scope?: valueof string)`                                                                     |
| `@clientDefaultValue` | `ModelProperty` | `(value: unknown, scope?: valueof string)`                                                     |
| `@markAsPageable`     | `Operation`     | `(itemsPath?: valueof string, continuationTokenPath?: valueof string, scope?: valueof string)` |
| `@disablePageable`    | `Operation`     | `(scope?: valueof string)`                                                                     |
| `@markAsLro`          | `Operation`     | `(scope?: valueof string)`                                                                     |
| `@nextLinkVerb`       | `Operation`     | `(value: EnumMember, scope?: valueof string)`                                                  |
| `@hierarchyBuilding`  | `Model`         | Legacy decorator for multi-level discriminated hierarchy                                       |

## Enums

- **`Access`**: `public`, `internal`
- **`Usage`**: `input` (2), `output` (4), `json` (256), `xml` (512)
- **`InitializedBy`**: `individually` (1), `parent` (2), `customizeCode` (4)
- **`DocumentationMode`**: `append`, `replace`

## Models

- **`ClientOptions`**: `{ service?: Namespace \| Namespace[], name?: string, autoMergeService?: boolean }`
- **`ClientInitializationOptions`**: `{ parameters?: Model, initializedBy?: EnumMember \| Union }`
- **`ExternalType`**: `{ identity: string, package?: string, minVersion?: string }`

## Feature Areas

| Area                   | Documented In               | Spector Spec                                                  |
| ---------------------- | --------------------------- | ------------------------------------------------------------- |
| Client structure       | 03client.mdx                | client/structure/\*                                           |
| Client initialization  | 03client.mdx                | azure/client-generator-core/client-initialization/            |
| Methods                | 04method.mdx                | (covered by client/structure)                                 |
| Paging                 | 05pagingOperations.mdx      | azure/core/page/\*                                            |
| LRO                    | 06longRunningOperations.mdx | azure/core/lro/\*                                             |
| Multipart              | 07multipart.mdx             | (in core specs)                                               |
| Types                  | 08types.mdx                 | (covered across specs)                                        |
| Renaming               | 09renaming.mdx              | client/naming/\*                                              |
| Versioning             | 10versioning.mdx            | azure/client-generator-core/api-version/\*                    |
| Hierarchy building     | 11hierarchyBuilding.mdx     | azure/client-generator-core/hierarchy-building/               |
| Client options         | 12clientOptions.mdx         | (no spec)                                                     |
| Access control         | (no dedicated page)         | azure/client-generator-core/access/                           |
| Usage                  | (no dedicated page)         | azure/client-generator-core/usage/                            |
| Override               | 04method.mdx                | azure/client-generator-core/override/                         |
| Flatten property       | (no dedicated page)         | azure/client-generator-core/flatten-property/                 |
| Client location        | (no dedicated page)         | azure/client-generator-core/client-location/\*                |
| Alternate type         | (no dedicated page)         | azure/client-generator-core/alternate-type/                   |
| Scope                  | (no dedicated page)         | (no spec)                                                     |
| API version marking    | (no dedicated page)         | azure/client-generator-core/api-version/\*                    |
| Client API versions    | (no dedicated page)         | (no spec)                                                     |
| Deserialize empty null | (no dedicated page)         | azure/client-generator-core/deserialize-empty-string-as-null/ |
| Response as bool       | (no dedicated page)         | (no spec)                                                     |
| Client doc             | (no dedicated page)         | (no spec)                                                     |
| Client namespace       | 02package.mdx, 08types.mdx  | client/namespace/                                             |
| Param alias            | 03client.mdx                | azure/client-generator-core/client-initialization/            |
| Protocol/Convenient    | 04method.mdx                | azure/client-generator-core/usage/                            |

## Doc Conventions

- Howto docs use `.mdx` extension with Astro Starlight frontmatter (`title`, `sidebar.label`)
- Code examples use `<ClientTabs>` component with six language blocks: typespec, python, csharp, typescript, java, go
- Legacy/deprecated decorators are marked with `:::caution` admonitions
- File naming: `##topic.mdx` where `##` is a two-digit number for ordering
- Imports at top: `import { ClientTabs } from "@site/src/components/client-tabs"`
- TypeSpec code blocks inside `<ClientTabs>` use triple-backtick with `typespec` language tag
- Language blocks that don't support a feature use `// NOT_SUPPORTED` comment

## Test Files

Key test files for verifying decorator behavior:

- `test/decorators/client.test.ts` — @client
- `test/decorators/access.test.ts` — @access
- `test/decorators/usage.test.ts`, `usage-extended.test.ts` — @usage
- `test/decorators/client-name.test.ts` — @clientName
- `test/decorators/client-namespace.test.ts` — @clientNamespace
- `test/decorators/client-initialization.test.ts` — @clientInitialization
- `test/decorators/client-location.test.ts` — @clientLocation
- `test/decorators/client-doc.test.ts` — @clientDoc
- `test/decorators/alternate-type.test.ts` — @alternateType
- `test/decorators/scope.test.ts` — @scope
- `test/decorators/api-version.test.ts` — @apiVersion
- `test/decorators/client-api-versions.test.ts` — @clientApiVersions
- `test/decorators/response-as-bool.test.ts` — @responseAsBool
- `test/decorators/deserialize-empty-string-as-null.test.ts` — @deserializeEmptyStringAsNull
- `test/decorators/override.test.ts` — @override
- `test/decorators/param-alias.test.ts` — @paramAlias
- `test/decorators/flatten-property.test.ts` — @flattenProperty
- `test/decorators/client-option.test.ts` — @clientOption

## Cross-References

- `@clientInitialization` works with `@paramAlias` for parameter renaming during elevation
- `@clientLocation` cannot be used along with `@client` or `@operationGroup`
- `@client` cannot be used along with `@clientLocation`
- `@access` propagates to base/sub models and discriminated types
- `@usage` propagates to properties, parent models, and discriminated sub models
- `@alternateType` with `ExternalType` identity cannot be applied to model properties — must target type definition
- `@clientOption` always emits a warning that must be suppressed
