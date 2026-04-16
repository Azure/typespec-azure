# TCGC Documentation Knowledge Base

## Environment Notes

- The repository requires Node.js >=22.0.0 for builds. The `.npmrc` has `engine-strict=true`.
- The `tspd` tool for regenerating reference docs requires the core submodule to be built first (`git submodule update --init && cd core && pnpm install && pnpm build`).
- To regenerate reference docs: `cd packages/typespec-client-generator-core && pnpm regen-docs`.
- To build azure-http-specs: `cd packages/azure-http-specs && pnpm build && pnpm validate-mock-apis`.
- `pnpm` is not pre-installed globally; install with `npm install -g pnpm`.

## Decorator Catalog

### Core Decorators (lib/decorators.tsp) — 21 decorators

1. `@clientName(rename, scope?)` — rename any type/operation
2. `@convenientAPI(target, flag?, scope?)` — control convenience method generation
3. `@protocolAPI(target, flag?, scope?)` — control protocol method generation
4. `@client(target, options?, scope?)` — define explicit client; ClientOptions has service, name, autoMergeService
5. `@operationGroup(target, scope?)` — DEPRECATED, use @client
6. `@usage(target, value, scope?)` — mark model/enum/union usage (input/output/json/xml)
7. `@access(target, value, scope?)` — public/internal visibility
8. `@override(target, override, scope?)` — customize method signatures
9. `@useSystemTextJsonConverter(target, scope?)` — C# backward compat only
10. `@clientInitialization(target, options, scope?)` — customize client init; options has parameters model and initializedBy flags
11. `@paramAlias(target, alias, scope?)` — alias client init parameter names
12. `@clientNamespace(target, rename, scope?)` — customize namespace
13. `@alternateType(target, alternate, scope?)` — replace types; alternate can be ExternalType with identity/package/minVersion
14. `@scope(target, scope?)` — language-specific scoping for operations/properties
15. `@apiVersion(target, value?, scope?)` — mark/unmark parameter as API version
16. `@clientApiVersions(target, value, scope?)` — extend client API version enum
17. `@deserializeEmptyStringAsNull(target, scope?)` — null deserialization for empty strings
18. `@responseAsBool(target, scope?)` — HEAD operations return boolean (2xx=true, 404=false)
19. `@clientLocation(source, target, scope?)` — move operations/params between clients
20. `@clientDoc(target, documentation, mode, scope?)` — override docs with append/replace mode
21. `@clientOption(target, name, value, scope?)` — pass experimental flags to emitters

### Legacy Decorators (lib/legacy.tsp) — 7 decorators

22. `@hierarchyBuilding(target, value, scope?)` — multi-level discriminator inheritance
23. `@flattenProperty(target, scope?)` — flatten model properties
24. `@markAsLro(target, scope?)` — force operation as LRO
25. `@markAsPageable(target, scope?)` — force operation as pageable
26. `@disablePageable(target, scope?)` — disable auto-detected pagination
27. `@nextLinkVerb(target, verb, scope?)` — set HTTP verb for next link (GET or POST)
28. `@clientDefaultValue(target, value, scope?)` — set client-level defaults

### Functions (lib/functions.tsp) — 4 functions

29. `replaceParameter(operation, selector, replacement)` — replace operation parameter
30. `removeParameter(operation, selector)` — remove optional parameter
31. `addParameter(operation, parameter)` — add new parameter
32. `reorderParameters(operation, order)` — reorder parameters by name list

## TSP Doc Comment Issues Found

- `@clientApiVersions` had incorrect @param description for `value` (was copy-pasted from @apiVersion). Fixed.
- `@paramAlias` example comment was confusing about what gets elevated. Fixed.

## Documentation File Map

| File                        | Topics                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 00howtogen.mdx              | Overview, language emitter setup                                                                                                                |
| 01setup.mdx                 | TCGC customization setup                                                                                                                        |
| 02package.mdx               | @service, @clientNamespace, license                                                                                                             |
| 03client.mdx                | @client, @clientLocation, @clientInitialization, @clientName, @clientNamespace, InitializedBy                                                   |
| 04method.mdx                | @convenientAPI, @protocolAPI, @override, @access, @usage, functions, @responseAsBool                                                            |
| 05pagingOperations.mdx      | @list, @pageItems, @nextLink, @continuationToken, @markAsPageable, @disablePageable, @nextLinkVerb                                              |
| 06longRunningOperations.mdx | LRO patterns, @pollingOperation, @markAsLro                                                                                                     |
| 07multipart.mdx             | @multipartBody, HttpPart, file upload                                                                                                           |
| 08types.mdx                 | @clientNamespace, @clientDefaultValue, @clientName, @discriminator, @alternateType, @clientDoc, @flattenProperty, @deserializeEmptyStringAsNull |
| 09renaming.mdx              | @clientName, @encodedName                                                                                                                       |
| 10versioning.mdx            | @versioned, @added, @removed, @apiVersion, @clientApiVersions                                                                                   |
| 11hierarchyBuilding.mdx     | @hierarchyBuilding (Legacy)                                                                                                                     |
| 12clientOptions.mdx         | @clientOption                                                                                                                                   |

## Documentation Patterns

- All howto .mdx files use frontmatter with `title:` and `llmstxt: true`
- All import `{ ClientTabs, ClientTabItem } from "@components/client-tabs"`
- Code examples use `<ClientTabs>` with 6 language blocks: typespec, python, csharp, typescript, java, go
- **Every `<ClientTabs>` block must be generated by the @doc-example-generator skill** — never hand-write
- Legacy decorator sections use `:::caution` alert blocks
- Heading hierarchy: H2 for main sections, H3/H4 for subsections

## Spector Spec Coverage

### Covered in azure/client-generator-core/

access, alternate-type, api-version, client-default-value, client-doc, client-initialization, client-location, convenient-api, deserialize-empty-string-as-null, flatten-property, hierarchy-building, next-link-verb, override, response-as-bool, usage

### Covered in client/

namespace (@clientNamespace), naming (@clientName), overload, structure (@client)

### Not Yet Covered (candidates for future specs)

- `@scope` — language-specific scoping
- `@markAsLro` — force LRO behavior
- `@markAsPageable` / `@disablePageable` — force/disable pagination
- `@clientOption` — experimental flags
- `@clientApiVersions` — extend API versions
- `@useSystemTextJsonConverter` — C# specific
- Functions (replaceParameter, removeParameter, addParameter, reorderParameters)

## Guideline.md (Emitter Developer Docs) Notes

- UsageFlags reference table was missing — added with all 13 flag values and descriptions.
- InitializedByFlags documentation was incomplete — added Individually, Parent, CustomizeCode descriptions.
- The `CustomizeCode` (4) flag means initialization is omitted from generated code and handled manually.
- `serializationOptions` and `baseModel` properties on SdkModelType are not documented in guideline.md but exist in interfaces.ts.

## Common Mistakes to Avoid

- Don't copy @param descriptions between decorators — @clientApiVersions had @apiVersion's description.
- The 03client.mdx file had a typo "@clientLocaton" (missing 'i') — fixed to "@clientLocation".
- In mockapi.ts files, query parameters use `query:` not `params:` in the request object.
