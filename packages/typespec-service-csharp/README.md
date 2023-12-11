# @azure-tools/typespec-service-csharp

Azure TypeSpec service code generator for c-sharp

## Install

```bash
npm install @azure-tools/typespec-service-csharp
```

## Emitter

### Usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-service-csharp
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-service-csharp"
```

### Emitter options

#### `skip-format`

**Type:** `boolean`

Skips formatting of generated C# Types. By default, C# files are formatted using 'dotnet format'.
