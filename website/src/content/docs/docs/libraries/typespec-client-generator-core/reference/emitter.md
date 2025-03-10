---
title: "Emitter usage"
---

## Usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-client-generator-core
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-client-generator-core"
```

The config can be extended with options as follows:

```yaml
emit:
  - "@azure-tools/typespec-client-generator-core"
options:
  "@azure-tools/typespec-client-generator-core":
    option: value
```

## Emitter options

### `generate-protocol-methods`

**Type:** `boolean`

### `generate-convenience-methods`

**Type:** `boolean`

### `package-name`

**Type:** `string`

### `flatten-union-as-enum`

**Type:** `boolean`

### `api-version`

**Type:** `string`

### `examples-directory`

**Type:** `string`

### `examples-dir`

**Type:** `string`

### `emitter-name`

**Type:** `string`

### `namespace`

**Type:** `string`
