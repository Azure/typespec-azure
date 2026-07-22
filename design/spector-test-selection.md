# Design: Standardized spector test selection

Tracking issue: [#4997](https://github.com/Azure/typespec-azure/issues/4997). Related:
**#4998** (standardize how the spector project is run) and **#5022** (shared scenario
generator; needs per-file custom options). This config is meant to be their shared input.

## Current state

All emitters regenerate test SDKs from the same specs (`@azure-tools/azure-http-specs`,
`@typespec/http-specs`), but each uses its own mechanism to pick specs and pass options.

| Emitter | Mechanism | Model | Options | Skip recorded as |
| ------- | --------- | ----- | ------- | ---------------- |
| Python | `regenerate-common.ts` `SKIP_SPECS` | opt-out | `AZURE_EMITTER_OPTIONS` map | `SKIP_SPECS` entry |
| Java | `Generate.ps1` regex `return` | opt-out | `if/elseif` chain | inline regex + comment |
| Go | `tspcompile.js` `*Group` objects | opt-in | per-test option array | commented-out line + issue |
| TS | `spector-list.js` `azureModularTsps` | opt-in | n/a | commented-out block + issue |

Note: Python's `regenerate-common.ts` is kept byte-identical with upstream
`@typespec/http-client-python` via `pnpm sync`. Core already tracks per-scenario status via
`@typespec/spector` coverage (`ScenarioStatus`: `not-implemented` / `not-supported` /
`not-applicable`).

## Decision: opt-in only

The config is an explicit allowlist — only listed specs generate.

- **Opt-out** (run everything, skip exceptions) gives max coverage pressure but a new/unsupported
  spec breaks that emitter's CI the moment it lands — the exact friction #4997 wants gone.
- **Opt-in** never breaks another emitter on a new spec; each team opts in when ready (one line).
  The silent-uncoverage risk is covered by the spector coverage dashboard (`not-implemented`).

We do **not** support a `default: run` toggle. With per-file options (#5022), opt-out makes an
entry ambiguous (is it opted-in, or just carrying options for an auto-discovered spec?). Opt-in
makes the `specs:` map the single source of truth: listed = runs, and options live on the entry.

Generation is per spec **file**; per-`@scenario` status stays with the existing coverage system.

## Format

One YAML file per emitter (e.g. `packages/typespec-go/spector.config.yaml`; an emitter that
pulls from several upstream spec packages may use one file per package), validated by a shared
JSON schema. Loaded by the private `@azure-tools/spector-config` package.

```yaml
# yaml-language-server: $schema=../spector-config/spector.config.schema.json
specs:
  azure/core/basic: true                 # run, no options

  type/enum/extensible:                  # run + custom options (#5022)
    options:
      namespace: type.enums.extensible

  azure/versioning/previewVersion:       # multiple outputs from one spec
    - options: { module: previewversiongroup, api-version: 2024-12-01-preview }
    - options: { module: previewversiongroupspecificversion, api-version: 2024-06-01 }

  # nested pageItems/nextLink not supported: https://github.com/Azure/autorest.go/issues/1494
  azure/payload/pageable: false          # tracked skip; comment carries the reason/issue
```

- **Key** — spec path relative to the specs root; may point at a specific `client.tsp`/`old.tsp`.
- **Value** — `true` (run) · `{ options: {...} }` (run + opaque emitter options) · a **list** of
  `{ options }` (run once per option-set — multiple outputs, e.g. two api-versions) · `false`
  (tracked skip, YAML comment documents why) · omitted (untracked skip).
- `options` replaces Python's `AZURE_EMITTER_OPTIONS`, Go's option arrays, and Java's `if/elseif`.
  Option names are opaque and emitter-specific (e.g. Go's `module`).
- `false` + comment (instead of structured `skip`/`reason`/`issue`) matches Go/TS today and keeps
  the value type simple.

Schema: `specs` is a map of string → `boolean`, an `{ options }` object, or a list of them.

## New tests

- **New spec file** — unlisted everywhere, generates nowhere; each team adds one entry when ready.
- **New `@scenario` in a listed file** — no config change; file regenerates. Scenario support is
  surfaced by coverage, not this config.

## Reference implementation

- `packages/spector-config` — private `@azure-tools/spector-config` package: YAML loader +
  resolver (`isSpecEnabled`, `getSpecOptions`, `resolveSpecs`) + JSON schema, with unit tests.
- **Go** — `packages/typespec-go/spector.config.{http,azure}.yaml` (one file per upstream spec
  package, since Go generates each into a different output tree). `tspcompile.js` loads them via
  the shared package and rebuilds its `module → [spec, ...options]` groups, so the rest of the
  driver is unchanged. `module` is carried as a per-file option. Verified: the reconstructed
  groups match the previous hardcoded objects exactly (46 + 48 modules).
- **Python** — `packages/typespec-python/spector.config.yaml` lists the opt-in specs;
  `regenerate.ts` filters the discovered specs against it. This is **selection-only**: per-spec
  emitter options stay in the upstream-synced `regenerate-common.ts` tables (they are
  flavor-aware and shared with `@typespec/http-client-python`), so that file is left untouched.
  Verified: the allowlist matches today's discovered set exactly (123 specs), so behavior is
  unchanged while new upstream specs are now opt-in.

## Migration (per emitter, incremental)

Go/TS commented-out lines → `false` + comment; option arrays → `options`. Java `return` skips →
`false`, option branches → `options`. Python `SKIP_SPECS`/`AZURE_EMITTER_OPTIONS` → `specs:` map
(pending upstream-sync decision).

## Open questions

- Where do the shared parser + schema live long-term — `core/`'s `@typespec/spector` or a
  `typespec-azure` package (the PoC uses the latter)?
- Python: land the format upstream first, or let Python read the shared file while keeping its
  logic (the PoC does the latter — selection-only, options stay in the synced tables)?
- Single `specs:` keyspace vs. split maps: the Go PoC uses one file per upstream spec package
  (`spector.config.http.yaml` / `spector.config.azure.yaml`) because each maps to a distinct
  output tree; a single-file variant would need to encode the spec source per entry.
- Lint that every `false` entry has a preceding comment?
