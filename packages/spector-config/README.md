# @azure-tools/spector-config

Shared loader for the standardized per-emitter spector test-selection config,
`spector.config.yaml`. See the design doc: [`design/spector-test-selection.md`](../../design/spector-test-selection.md).

This is a private, dev-only package used by emitter regeneration scripts. It is
not published and is not part of any emitter's runtime output.

## Config format

An opt-in allowlist of spec files to generate. Only specs listed with a truthy
value are generated.

```yaml
# yaml-language-server: $schema=../spector-config/spector.config.schema.json
specs:
  azure/core/basic: true                 # run, no options

  type/enum/extensible:                  # run + custom emitter options
    options:
      namespace: type.enums.extensible

  # nested pageItems/nextLink not supported: https://github.com/Azure/autorest.go/issues/1494
  azure/payload/pageable: false          # tracked skip; comment carries the reason/issue
```

- **`true`** — generate, no options.
- **`{ options: {...} }`** — generate with opaque emitter options.
- **`false`** — tracked skip (a YAML comment documents why).
- **omitted** — untracked skip.

## Usage

```ts
import { loadSpectorConfig, resolveSpecs } from "@azure-tools/spector-config";

const config = loadSpectorConfig("spector.config.yaml");
for (const { path, options } of resolveSpecs(config)) {
  // compile `path` with `options`
}
```
