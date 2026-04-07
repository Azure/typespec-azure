# TCGC Documentation Knowledge Base

## Decorator Namespace Conventions in Spector Specs

In Spector specs (`packages/azure-http-specs/specs/`), TCGC decorators must use fully qualified names with the `@global.Azure.ClientGenerator.Core.` prefix (e.g., `@global.Azure.ClientGenerator.Core.convenientAPI(false)`). The `using Azure.ClientGenerator.Core;` import alone is NOT sufficient for decorator resolution in Spector spec compilation. The `@@` augmentation syntax also requires the `@@global.Azure.ClientGenerator.Core.` prefix.

## Doc Comment Source for Reference Docs

The auto-generated reference docs at `website/src/content/docs/docs/libraries/typespec-client-generator-core/reference/decorators.md` are generated from doc comments in `packages/typespec-client-generator-core/lib/decorators.tsp` and `lib/legacy.tsp`. Run `pnpm regen-docs` from `packages/typespec-client-generator-core/` after editing doc comments. Never edit the generated `decorators.md` directly.

## Access Decorator Syntax

The `@access` decorator takes `Access.internal` or `Access.public` enum values, NOT string literals. The previous documentation incorrectly showed `@@access(Target, "internal")` — the correct syntax is `@@access(Target, Access.internal)`.

## Howto Doc File Ownership

Each howto file owns specific topics:

- `01setup.mdx` — setup, language scoping (`@scope`)
- `02package.mdx` — `@service`, `@clientNamespace`, licensing
- `03client.mdx` — `@client`, `@clientInitialization`, `@paramAlias`, `@clientLocation`, client hierarchy
- `04method.mdx` — `@protocolAPI`, `@convenientAPI`, `@access`, `@usage`, `@override`, `@responseAsBool`, `@clientDoc`, transformation functions
- `05pagingOperations.mdx` — paging patterns, `@nextLinkVerb`, `@markAsPageable`, `@disablePageable`
- `06longRunningOperations.mdx` — LRO patterns, `@markAsLro`
- `08types.mdx` — type mappings, `@alternateType`, `@clientDefaultValue`, `@flattenProperty`, `@deserializeEmptyStringAsNull`
- `09renaming.mdx` — `@clientName`, `@encodedName`
- `10versioning.mdx` — `@versioned`, `@apiVersion`, `@clientApiVersions`
- `11hierarchyBuilding.mdx` — `@hierarchyBuilding` (legacy)
- `12clientOptions.mdx` — `@clientOption`

## pnpm Availability

In CI environments, `pnpm` may not be on PATH. Use `corepack pnpm` or create a wrapper script at `/tmp/gh-aw/agent/bin/pnpm` that invokes `node /home/runner/.cache/node/corepack/v1/pnpm/<version>/bin/pnpm.cjs`. Add `/tmp/gh-aw/agent/bin` to PATH.

## Spector Validation Sequence

From `packages/azure-http-specs`, run in this exact order:

1. `pnpm build` (compiles TypeScript and validates scenarios)
2. `pnpm validate-mock-apis` (verifies mock API implementations)
3. `pnpm cspell` (check spelling — run from repo root)
4. `pnpm format:dir packages/azure-http-specs` (run from repo root)
5. `pnpm regen-docs` (regenerate spec-summary.md)

Note: `pnpm lint` and `pnpm format` scripts don't exist in the azure-http-specs package — use root-level `pnpm format:dir`.

## Legacy Decorators Still Active

All decorators in `Azure.ClientGenerator.Core.Legacy` namespace (`lib/legacy.tsp`) are still functional and used in production: `@hierarchyBuilding`, `@flattenProperty`, `@markAsLro`, `@markAsPageable`, `@disablePageable`, `@nextLinkVerb`, `@clientDefaultValue`. They should be documented with caution warnings but NOT ignored.

## Decorators Without Spector Coverage (remaining)

The following decorators still need Spector specs: `@useSystemTextJsonConverter`, `@clientApiVersions`, `@clientOption`, `@markAsLro`, `@markAsPageable`, `@disablePageable`, and the transformation functions (`replaceParameter`, `removeParameter`, `addParameter`, `reorderParameters`).
