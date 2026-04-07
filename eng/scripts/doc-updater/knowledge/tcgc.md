# TCGC Documentation Knowledge Base

## Build & Tooling

- `pnpm` is not on PATH by default in CI. Use `corepack enable --install-directory /home/runner/.local/bin` then `export PATH="/home/runner/.local/bin:$PATH"`.
- The `core/` git submodule must be initialized (`git submodule update --init`) before building TCGC.
- Build TCGC: `pnpm -r --filter "@azure-tools/typespec-client-generator-core..." build`
- Regenerate reference docs after TSP changes: `cd packages/typespec-client-generator-core && pnpm regen-docs`
- Regenerate Spector summary: `cd packages/azure-http-specs && pnpm regen-docs`
- The azure-http-specs package name is `@azure-tools/azure-http-specs` (not `@typespec/azure-http-specs`).
- `pnpm format` and `pnpm lint` are root-level commands; use `pnpm format:dir <path>` for specific directories.

## Documentation Structure

- **Howto docs** (`website/.../howtos/Generate client libraries/`): Files 00-12.mdx, each covering a specific topic. Use `<ClientTabs>` for multi-language examples.
- **Emitter dev docs** (`guideline.md`): Describes the TCGC type graph for emitter developers. Links to reference/js-api for type details.
- **Reference docs** (auto-generated): Run `pnpm regen-docs` from TCGC package after changing `.tsp` doc comments. Never edit these manually.
- **Design docs** (`packages/typespec-client-generator-core/design-docs/`): Internal docs for TCGC contributors. Has `client.md` and `multiple-services.md`.

## Decorator Inventory (as of this run)

### Core Decorators (Azure.ClientGenerator.Core)

1. `@clientName` — rename SDK elements
2. `@convenientAPI` — enable/disable convenience method
3. `@protocolAPI` — enable/disable protocol method
4. `@client` — define client structure (ClientOptions: name, service, autoMergeService)
5. `@operationGroup` — DEPRECATED alias for @client
6. `@usage` — add usage flags (input, output, json, xml)
7. `@access` — set public/internal visibility
8. `@override` — replace operation with different one
9. `@useSystemTextJsonConverter` — C# specific
10. `@clientInitialization` — customize client init params (ClientInitializationOptions: parameters, initializedBy)
11. `@paramAlias` — alias parameter names
12. `@clientNamespace` — override SDK namespace
13. `@alternateType` — replace type with alternate (supports ExternalType)
14. `@scope` — limit operation/parameter to language scopes
15. `@apiVersion` — mark parameter as API version
16. `@clientApiVersions` — client-specific version enum
17. `@deserializeEmptyStringAsNull` — empty string → null
18. `@responseAsBool` — HEAD operation returns boolean
19. `@clientLocation` — move operations/parameters between clients
20. `@clientDoc` — client-specific documentation (DocumentationMode: append/replace)
21. `@clientOption` — pass options to emitters

### Legacy Decorators (Azure.ClientGenerator.Core.Legacy)

1. `@hierarchyBuilding` — multi-layer discriminator hierarchy
2. `@flattenProperty` — flatten model property
3. `@markAsLro` — force LRO treatment
4. `@markAsPageable` — force paging treatment
5. `@disablePageable` — disable paging detection
6. `@nextLinkVerb` — set HTTP verb for next link
7. `@clientDefaultValue` — set client-side defaults

### Functions

1. `replaceParameter` — replace operation parameter
2. `removeParameter` — remove operation parameter
3. `addParameter` — add operation parameter
4. `reorderParameters` — reorder operation parameters

## Spector Test Coverage

### Covered decorators (have Spector specs):

- @access, @alternateType, @apiVersion, @clientDefaultValue, @clientInitialization
- @clientLocation, @deserializeEmptyStringAsNull, @flattenProperty, @hierarchyBuilding
- @nextLinkVerb, @override, @usage, @responseAsBool
- @client (client/structure/), @clientName (client/naming/), @clientNamespace (client/namespace/)

### Not covered (no HTTP behavior to test, or legacy):

- @clientDoc — only affects documentation strings, no HTTP behavior
- @clientOption — passes options to emitters, no HTTP behavior
- @convenientAPI/@protocolAPI — affects which methods are generated, no HTTP behavior
- @scope — language filtering, no HTTP behavior
- @clientApiVersions — extends version enums, covered partially by api-version specs
- @markAsLro, @markAsPageable, @disablePageable — legacy, complex mock API needed

## Common Mistakes Found

- Typos in doc comments propagate to generated reference docs. Always verify `.tsp` doc comments carefully.
- The `@client` decorator's third example tag was empty (no content) — removed in this run.
- The `@clientLocation` decorator's `@param source` description said "operation" but the signature accepts `Operation | ModelProperty` — fixed.
- The `@clientLocaton` typo in `03client.mdx` line 600 — fixed.
- The `@markAsLro` doc had "operatio" typo — fixed.

## Guideline.md Patterns

- Type descriptions should include key property names that emitter developers need.
- For example, `SdkEnumType` needs `isFixed`, `isUnionAsEnum`, `valueType`; `SdkDateTimeType`/`SdkDurationType` need `wireType` and `encode`.
- Collection types need `valueType`, `keyType` documented explicitly.
- `SdkModelType` needs `baseModel`, `discriminatorProperty`, `discriminatedSubtypes`, `additionalProperties`.
