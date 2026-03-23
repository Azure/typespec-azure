# TCGC Documentation Knowledge Base

## Decorator Signatures (from lib/decorators.tsp)

### Main Decorators (Azure.ClientGenerator.Core)

| Decorator                       | Target                                                  | Key Parameters                                 | Doc Page                   |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| `@clientName`                   | `unknown`                                               | `rename: string, scope?: string`               | 09renaming.mdx             |
| `@convenientAPI`                | `Operation \| Namespace \| Interface`                   | `flag?: boolean, scope?: string`               | 04method.mdx               |
| `@protocolAPI`                  | `Operation \| Namespace \| Interface`                   | `flag?: boolean, scope?: string`               | 04method.mdx               |
| `@client`                       | `Namespace \| Interface`                                | `options?: ClientOptions, scope?: string`      | 03client.mdx               |
| `@operationGroup`               | `Namespace \| Interface`                                | `scope?: string`                               | 03client.mdx               |
| `@usage`                        | `Model \| Enum \| Union \| Namespace`                   | `value: EnumMember \| Union, scope?: string`   | 04method.mdx               |
| `@access`                       | `ModelProperty \| Model \| Operation \| Enum \| Union…` | `value: EnumMember, scope?: string`            | 04method.mdx               |
| `@override`                     | `Operation`                                             | `override: Operation, scope?: string`          | 04method.mdx               |
| `@useSystemTextJsonConverter`   | `Model`                                                 | `scope?: string`                               | _(C#-specific, no howto)_  |
| `@clientInitialization`         | `Namespace \| Interface`                                | `options: ClientInitializationOptions, …`      | 03client.mdx               |
| `@paramAlias`                   | `ModelProperty`                                         | `paramAlias: string, scope?: string`           | 03client.mdx               |
| `@clientNamespace`              | `Namespace \| Interface \| Model \| Enum \| Union`      | `rename: string, scope?: string`               | 02package.mdx              |
| `@alternateType`                | `ModelProperty \| Scalar \| Model \| Enum \| Union`     | `alternate: unknown \| ExternalType, …`        | 08types.mdx                |
| `@scope`                        | `Operation \| ModelProperty`                            | `scope?: string`                               | 04method.mdx               |
| `@apiVersion`                   | `ModelProperty`                                         | `value?: boolean, scope?: string`              | 10versioning.mdx           |
| `@clientApiVersions`            | `Namespace`                                             | `value: Enum, scope?: string`                  | 10versioning.mdx           |
| `@deserializeEmptyStringAsNull` | `ModelProperty`                                         | `scope?: string`                               | 08types.mdx                |
| `@responseAsBool`               | `Operation`                                             | `scope?: string`                               | 04method.mdx               |
| `@clientLocation`               | `Operation \| ModelProperty`                            | `target: Interface \| Namespace \| …`          | 03client.mdx, 04method.mdx |
| `@clientDoc`                    | `unknown`                                               | `documentation: string, mode: EnumMember, …`   | 08types.mdx                |
| `@clientOption`                 | `unknown`                                               | `name: string, value: unknown, scope?: string` | 12clientOptions.mdx        |

### Legacy Decorators (Azure.ClientGenerator.Core.Legacy)

| Decorator             | Target          | Key Parameters                          | Doc Page                    |
| --------------------- | --------------- | --------------------------------------- | --------------------------- |
| `@hierarchyBuilding`  | `Model`         | `value: Model, scope?: string`          | 11hierarchyBuilding.mdx     |
| `@flattenProperty`    | `ModelProperty` | `scope?: string`                        | 08types.mdx                 |
| `@markAsLro`          | `Operation`     | `scope?: string`                        | 06longRunningOperations.mdx |
| `@markAsPageable`     | `Operation`     | `scope?: string`                        | 05pagingOperations.mdx      |
| `@disablePageable`    | `Operation`     | `scope?: string`                        | 05pagingOperations.mdx      |
| `@nextLinkVerb`       | `Operation`     | `verb: "GET" \| "POST", scope?: string` | 05pagingOperations.mdx      |
| `@clientDefaultValue` | `ModelProperty` | `value: string \| boolean \| numeric`   | 08types.mdx                 |

## Model Definitions (from lib/decorators.tsp)

- `ClientOptions`: `{ service?: Namespace | Namespace[]; name?: string; autoMergeService?: boolean }`
- `ClientInitializationOptions`: `{ parameters?: Model; initializedBy?: EnumMember | Union }`
- `ExternalType`: `{ identity: string; package?: string; minVersion?: string }`

## Enum Definitions

- `Usage`: `{ input: 2, output: 4, json: 256, xml: 512 }`
- `Access`: `{ public: "public", internal: "internal" }`
- `InitializedBy`: `{ individually: 1, parent: 2, customizeCode: 4 }`
- `DocumentationMode`: `{ append: "append", replace: "replace" }`

## Doc Conventions

- User howto docs: `website/src/content/docs/docs/howtos/Generate client libraries/`
  - Format: `.mdx` with `import { ClientTabs, ClientTabItem } from "@components/client-tabs"`
  - All code examples use `<ClientTabs>` with 6 language blocks (typespec, python, csharp, typescript, java, go)
  - Legacy decorators get `:::caution` admonitions
  - Files numbered 00–12 in reading order
- Emitter dev docs: `website/src/content/docs/docs/libraries/typespec-client-generator-core/guideline.md`
  - References types via links to `../reference/js-api/` pages
- Design docs: `packages/typespec-client-generator-core/design-docs/`
  - Internal design documents, uses YAML-like pseudo-code for type graph examples

## Spector Spec Coverage

| Feature             | Spec Location                                              | Scenarios |
| ------------------- | ---------------------------------------------------------- | --------- |
| `@clientName`       | `specs/client/naming/`                                     | 14        |
| `@client` structure | `specs/client/structure/`                                  | 6         |
| `@clientNamespace`  | `specs/client/namespace/`                                  | 1         |
| `@scope`            | `specs/client/scope/`                                      | 2         |
| `@responseAsBool`   | `specs/client/response-as-bool/`                           | 2         |
| Overloads           | `specs/client/overload/`                                   | 2         |
| Access control      | `specs/azure/client-generator-core/access/`                | Multiple  |
| Client init         | `specs/azure/client-generator-core/client-initialization/` | Multiple  |
| Client location     | `specs/azure/client-generator-core/client-location/`       | Multiple  |
| Flatten property    | `specs/azure/client-generator-core/flatten-property/`      | Multiple  |
| Hierarchy building  | `specs/azure/client-generator-core/hierarchy-building/`    | Multiple  |

## Cross-References

- `@moveTo` was renamed to `@clientLocation` — ensure no `@moveTo` references remain in docs
- `@clientDoc` requires `DocumentationMode` enum parameter (not just string) — signature: `(target, documentation, mode: EnumMember, scope?)`
- `@clientApiVersions` takes an `Enum` (not `string[]`) as the value parameter
