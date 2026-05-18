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

22. `@hierarchyBuilding(target, value, scope?)` — change base type of a model in SDK; lifts properties from removed intermediates, reconciles duplicates with new base chain
23. `@flattenProperty(target, scope?)` — flatten model properties
24. `@markAsLro(target, scope?)` — force operation as LRO
25. `@markAsPageable(target, scope?)` — force operation as pageable
26. `@disablePageable(target, scope?)` — disable auto-detected pagination
27. `@nextLinkVerb(target, verb, scope?)` — set HTTP verb for next link (GET or POST)
28. `@clientDefaultValue(target, value, scope?)` — set client-level defaults

### Functions (lib/functions.tsp) — 5 functions

29. `replaceParameter(operation, selector, replacement)` — replace operation parameter
30. `removeParameter(operation, selector)` — remove optional parameter
31. `addParameter(operation, parameter)` — add new parameter
32. `reorderParameters(operation, order)` — reorder parameters by name list
33. `exact(name)` — mark a client name as exact, preventing casing transformations; used with @clientName; sets `isExactName: true` on the type graph

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
| 09renaming.mdx              | @clientName, @encodedName, exact()                                                                                                              |
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

access, alternate-type, api-version, client-default-value, client-doc, client-initialization, client-location, deserialize-empty-string-as-null, exact-name, flatten-property, hierarchy-building, next-link-verb, override, response-as-bool, usage

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

### Specs Removed (feedback from PR #4268)

- `convenient-api` — removed because @convenientAPI/@protocolAPI are code-generation controls that aren't testable at the wire level via Spector

## Guideline.md (Emitter Developer Docs) Notes

- UsageFlags reference table was missing — added with all 13 flag values and descriptions.
- InitializedByFlags documentation was incomplete — added Individually, Parent, CustomizeCode descriptions.
- The `CustomizeCode` (4) flag means initialization is omitted from generated code and handled manually.
- `serializationOptions` on SdkModelType properties was already documented. Now also documented on `SdkBodyParameter` and `SdkHttpResponseBase` in the HTTP Operation Parameters and Response sections.
- `baseModel` property on SdkModelType is not documented in guideline.md but exists in interfaces.ts.

## Diagnostics

- `operation-not-in-client`: REMOVED in May 2026. This diagnostic no longer exists.
- `inconsistent-multiple-service-dependency` (warning): Emitted when services merged into the same client depend on different versions of a shared library dependency. Documented in 03client.mdx under the "One Client from Multiple Services" section and in guideline.md under "Client Detection".
- `legacy-hierarchy-building-conflict` (warning): Now only has `property-type-mismatch` message ID (the old `property-missing` and `type-mismatch` message IDs were removed). Emitted during property reconciliation when a dropped property's type is incompatible with the same-named property on the new base chain.

## External Type Usage Propagation

- Types marked as external (via `@alternateType` with `ExternalTypeInfo`) only receive the `External` usage flag. TCGC blocks propagation of non-`External` usage flags (`Input`, `Output`, `Json`, etc.) through external types. This was a bug fix — previously, types reachable through external types could incorrectly get `Input`/`Output` flags.
- The `External` usage flag description in guideline.md was expanded to explain the propagation blocking behavior.
- The `@alternateType` external types Notes section in 08types.mdx was updated to explain that types only reachable through external types won't get `Input`/`Output` flags.

## Encoding Context Awareness

- The `encode` property on `SdkBuiltInType` is not only set by the `@encode` decorator. TCGC also sets it contextually — for example, `bytes` in a `multipart/form-data` part get `encode: "bytes"` (raw binary) instead of the default `"base64"`. This is handled in `addMultipartPropertiesToModelType` in `src/types.ts`, which calls `addEncodeInfo` with the part's default content type.
- The guideline.md description of `SdkBuiltInType.encode` was updated to reflect this contextual encoding behavior.

## Common Mistakes to Avoid

- Don't copy @param descriptions between decorators — @clientApiVersions had @apiVersion's description.
- The 03client.mdx file had a typo "@clientLocaton" (missing 'i') — fixed to "@clientLocation".
- In mockapi.ts files, query parameters use `query:` not `params:` in the request object.
- The guideline.md previously said `encode` is set only when `@encode` exists — this was inaccurate since encode can also be set contextually (e.g., multipart).
- Use `// NOT_SUPPORTED` for language examples where an emitter doesn't support a feature. Do NOT use `// TODO: fill in X example manually`.
- Separate changesets: TCGC documentation updates use "internal" changeKind. Spector spec additions use "feature" changeKind with a separate changeset file.
- Don't add Spector specs for code-generation controls like @convenientAPI/@protocolAPI — they aren't testable at the HTTP wire level.
- The `@deserializeEmptyStringAsNull` section was removed from 08types.mdx in feedback PR #4268. Don't re-add it unless specifically requested.
- Spector response-as-bool spec needs BOTH a success (200) case AND a 404 case to be complete.
- TypeSpec examples in docs with operations MUST include `@route` decorators to be valid TypeSpec (feedback PR #4398).
- In @hierarchyBuilding language examples: each language handles inheritance differently. Python doesn't use real hierarchy (copies all props to each class). Go uses flat structs. C# and TypeScript use real inheritance. Java uses class inheritance.
- C# property names that conflict with their enclosing class name should use a suffix (e.g., `CProperty` not `C` for a property in class `C`).
- The "Body Model Properties Named apiVersion" section was removed from 10versioning.mdx during review (PR #4398) — don't re-add as a separate section. The behavior is covered implicitly by the main description.

## @responseAsBool Internal Design

- HTTP response objects have `type: undefined` when @responseAsBool is applied. The boolean is computed at the method response level only.
- The method response `optional` is never set for @responseAsBool operations (boolean is always true or false, never optional).
- The 404 response is promoted from exception to valid response with status code 404.

## @hierarchyBuilding Reconciliation (May 2026 Overhaul)

- No validation at decoration time. Property reconciliation happens during SDK type graph building.
- Properties from removed intermediate ancestors are "lifted" onto the rebased model.
- Properties whose names are supplied by the new base chain are dropped (inherited instead).
- Discriminator properties are never dropped, even if new base has same-named property.
- Type compatibility uses TypeSpec's `isAssignableTo` in both directions — literal/sub-scalar types assignable to a wider base type are silently dropped.
- The diagnostic message ID changed from "property-missing"/"type-mismatch" to just "property-type-mismatch".

## Content-Type/Accept Header Design (May 2026)

- Single content type: constant value.
- Multiple request content types: enum with one value per content type.
- Multiple response content types: single constant with comma-joined string (structured types first).
- Constants and enums get proper generated names via the naming context path (e.g., `DownloadFileMultipleContentTypesAccept`).

## Usage Flag Propagation

- Readonly properties have Input flag stripped but other flags (Output, Json, Xml) still propagate through.
- External types (via @alternateType with ExternalTypeInfo) block propagation of all non-External flags.
- `@apiVersion(false)` prevents a parameter from matching to a client API version parameter, keeping it on the method.
- Body model properties named "apiVersion" are NOT treated as API version params — only HTTP metadata params (header/query/path/cookie) and server URL template parameters (from `@server`) are matched by name.
- Server URL template parameters (declared in `@server` decorator's parameter model) named `apiVersion`/`api-version` are recognized as API version params, even with plain `string` type in versioned services.

## isExactName Property (May 2026)

- The `isExactName: boolean` property was added to many SDK type interfaces: SdkModelType, SdkEnumType, SdkUnionType, SdkConstantType, SdkNullableType, SdkClientInitializationType, and SdkModelPropertyTypeBase (base for all property types).
- Set to `true` when a name is wrapped with the `exact()` function in `@clientName`.
- The `exact()` function internally prepends `_exact_:` prefix which is stripped by `normalizeExactName()` before the name reaches the type graph.
- Exported helpers: `EXACT_NAME_PREFIX`, `hasExactNameMarker()`, `normalizeExactName()` from the TCGC package index.
- Public utility: `isExactClientName(context, type)` checks whether a type has exact name override.
- Documented in guideline.md under Common Properties and in 09renaming.mdx under "Preserving exact casing".

## Feedback Lessons (PR #4416)

- In TypeScript code examples, keep method signatures on a single line when they fit within ~120 characters. Don't use multi-line formatting for short method signatures.
