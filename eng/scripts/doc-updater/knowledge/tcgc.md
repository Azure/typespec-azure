# TCGC Documentation Knowledge Base

## Package Info

- **Name:** `@azure-tools/typespec-client-generator-core`
- **TSP main:** `lib/main.tsp`
- **Decorators TSP:** `lib/decorators.tsp`
- **Public exports:** `src/index.ts` → context, decorators, interfaces, lib, linter, public-utils, types

## Decorator Signatures (from `lib/decorators.tsp`)

| Decorator                       | Target                                   | Key Parameters                                                |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `@access`                       | Model, Operation, Enum, Union            | `value: EnumMember, scope?: string`                           |
| `@alternateType`                | Scalar, ModelProperty                    | `alternate: unknown \| ExternalType, scope?: string`          |
| `@apiVersion`                   | ModelProperty                            | `value?: boolean, scope?: string`                             |
| `@client`                       | Namespace, Interface                     | `options?: ClientOptions, scope?: string`                     |
| `@clientApiVersions`            | Namespace                                | `value: Enum, scope?: string`                                 |
| `@clientDoc`                    | unknown                                  | `documentation: string, mode: EnumMember, scope?: string`     |
| `@clientInitialization`         | Namespace, Interface                     | `options: ClientInitializationOptions, scope?: string`        |
| `@clientLocation`               | Operation, ModelProperty                 | `target: Interface\|Namespace\|Operation\|string, scope?: s.` |
| `@clientName`                   | any                                      | `rename: string, scope?: string`                              |
| `@clientNamespace`              | Namespace, Interface, Model, Enum, Union | `rename: string, scope?: string`                              |
| `@clientOption`                 | Operation, Model, Enum, ModelProperty    | `name: string, value: unknown, scope?: string`                |
| `@convenientAPI`                | Operation                                | `flag?: boolean, scope?: string`                              |
| `@deserializeEmptyStringAsNull` | ModelProperty                            | `scope?: string`                                              |
| `@operationGroup`               | Namespace, Interface                     | `scope?: string` _(deprecated, alias for @client)_            |
| `@override`                     | Operation                                | `override: Operation, scope?: string`                         |
| `@paramAlias`                   | ModelProperty                            | `paramAlias: string, scope?: string`                          |
| `@protocolAPI`                  | Operation                                | `flag?: boolean, scope?: string`                              |
| `@responseAsBool`               | Operation                                | `scope?: string`                                              |
| `@scope`                        | Operation, ModelProperty                 | `scope?: string`                                              |
| `@usage`                        | Model, Enum, Union, Namespace            | `value: EnumMember \| Union, scope?: string`                  |
| `@useSystemTextJsonConverter`   | Model, Enum, Union, ModelProperty        | `scope?: string` _(C#-specific)_                              |

### Legacy Decorators

- `@disablePageable`, `@markAsPageable`, `@markAsLro`, `@flattenProperty`, `@clientDefaultValue`, `@nextLinkVerb`

### Enums Used by Decorators

- `DocumentationMode`: `append`, `replace` — used by `@clientDoc`
- `InitializedBy`: `individually`, `parent` — used in `ClientInitializationOptions.initializedBy`
- `Access`: `public`, `internal` — used by `@access`
- `Usage`: `input`, `output` — used by `@usage`

## Feature → Doc Page Mapping

| Feature Area              | Howto Doc File     | Spector Spec Directory                            |
| ------------------------- | ------------------ | ------------------------------------------------- |
| Client structure          | `03client.mdx`     | `client/structure/*`, `client-generator-core/...` |
| Client initialization     | `03client.mdx`     | `client-generator-core/client-initialization/*`   |
| Client location           | `03client.mdx`     | `client-generator-core/client-location/*`         |
| Parameter aliasing        | `03client.mdx`     | `client-generator-core/param-alias/`              |
| Methods (basic)           | `04method.mdx`     | —                                                 |
| Protocol/Convenient API   | `04method.mdx`     | `client-generator-core/protocol-and-convenient/`  |
| Access control            | `04method.mdx`     | `client-generator-core/access/`                   |
| @responseAsBool           | `04method.mdx`     | `client-generator-core/response-as-bool/`         |
| @scope                    | `04method.mdx`     | —                                                 |
| Paging                    | `05paging*.mdx`    | `azure/core/page/`, `azure/payload/pageable/`     |
| LRO                       | `06lro*.mdx`       | `azure/core/lro/*`                                |
| Multipart                 | `07multipart.mdx`  | —                                                 |
| Types & models            | `08types.mdx`      | —                                                 |
| @deserializeEmpty...      | `08types.mdx`      | `client-generator-core/deserialize-empty-str.../` |
| @alternateType            | `08types.mdx`      | `client-generator-core/alternate-type/`           |
| @clientDoc                | `08types.mdx`      | `client-generator-core/client-doc/`               |
| Renaming (@clientName)    | `09renaming.mdx`   | `client/naming/`                                  |
| Versioning                | `10versioning.mdx` | `azure/versioning/previewVersion/`                |
| @clientApiVersions        | `10versioning.mdx` | —                                                 |
| Hierarchy building        | `11hierarchy*.mdx` | `client-generator-core/hierarchy-building/`       |
| @clientOption             | `12clientOpts.mdx` | —                                                 |
| Package/namespace/license | `02package.mdx`    | —                                                 |

## Doc Conventions

### Howto Docs (`website/.../howtos/Generate client libraries/`)

- Frontmatter: `title`, `llmstxt: true`
- Import: `import { ClientTabs, ClientTabItem } from "@components/client-tabs";`
- Two `<ClientTabs>` styles used:
  1. **Simple**: `<ClientTabs>` wrapping code blocks with lang identifiers (most files)
  2. **ItemBased**: `<ClientTabItem lang="...">` wrappers (08types.mdx)
- Language order in tabs: typespec → python → csharp → typescript → java → go
- Unsupported languages use `// NOT_SUPPORTED` or `# NOT_SUPPORTED`
- TypeSpec blocks use `title=main.tsp` / `title=client.tsp` attributes
- Legacy decorators get `:::caution` admonitions

### Spector Specs (`packages/azure-http-specs/specs/`)

- Must use `global.Azure.ClientGenerator.Core` in `using` statements (due to `_Specs_` namespace)
- Scenario names auto-derived: `_Specs_.Azure.Foo.Bar.op` → `Azure_Foo_Bar_op`
- `@scenarioService("/base/path")` at namespace level
- `@scenario` + `@scenarioDoc(...)` per testable operation/namespace
- Java `clientNamespace` override: `@global.Azure.ClientGenerator.Core.clientNamespace("...", "java")`
- mockapi.ts: `Scenarios` object keys must match auto-derived scenario names exactly

## Guideline.md Coverage Gaps

These public types/utils are NOT documented in `guideline.md`:

- Types: `TCGCContext`, `InitializedByFlags`, `SdkMethodResponse`, `SdkHttpResponse`, `SdkHttpErrorResponse`, `SdkNamespace`
- Utilities: `getDefaultApiVersion`, `isApiVersion`, `getEffectivePayloadType`, `getPropertyNames`, `getLibraryName`, `getCrossLanguageDefinitionId`, `getGeneratedName`, `getHttpOperationWithCache`, `isAzureCoreModel`, `isPagedResultModel`, `getClientPath`, `getClientOptions`
