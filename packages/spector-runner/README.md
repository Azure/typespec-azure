# @azure-tools/spector-runner

Shared loader and JSON schema for the standardized per-emitter spector
test-selection config, `spector.config.yaml`.
Tracking issue: [#4997](https://github.com/Azure/typespec-azure/issues/4997).

This is a private, dev-only package used by emitter regeneration scripts. It is
not published and is not part of any emitter's runtime output.

The JSON schema is generated from [`schema/spector-config.tsp`](./schema/spector-config.tsp)
via `@typespec/json-schema` (`pnpm regen-schema`) to `schema/dist/SpectorConfig.json`.

## Config format

An opt-in allowlist of spec files to generate. Only specs listed with a truthy
value are generated.

```yaml
# yaml-language-server: $schema=../spector-runner/schema/dist/SpectorConfig.json
specs:
  azure/core/basic: true # run, no options

  type/enum/extensible: # run + custom emitter options
    options:
      namespace: type.enums.extensible

  # nested pageItems/nextLink not supported: https://github.com/Azure/autorest.go/issues/1494
  azure/payload/pageable: false # tracked skip; comment carries the reason/issue
```

- **`true`** — generate, no options.
- **`{ options: {...} }`** — generate with opaque emitter options.
- **`[{ options }, ...]`** — generate once per option-set (multiple outputs).
- **`false`** — tracked skip (a YAML comment documents why).
- **omitted** — untracked skip.

## Usage

```ts
import { loadSpectorConfig, resolveSpecs } from "@azure-tools/spector-runner";

const config = loadSpectorConfig("spector.config.yaml");
for (const { path, options } of resolveSpecs(config)) {
  // compile `path` with `options`
}
```
