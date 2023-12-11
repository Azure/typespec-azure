---
title: "Emitter usage"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Emitter

## Usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-service-csharp
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-service-csharp"
```

## Emitter options

### `skip-format`

**Type:** `boolean`

Skips formatting of generated C# Types. By default, C# files are formatted using 'dotnet format'.
