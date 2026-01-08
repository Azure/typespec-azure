# @azure-tools/typespec-metadata

TypeSpec emitter that produces structured metadata snapshots for APIView and other tooling.

## Install

```bash
npm install @azure-tools/typespec-metadata
```

## Usage

Add the emitter to your TypeSpec project:

```bash
tsp compile . --emit @azure-tools/typespec-metadata
```

Or configure it in your `tspconfig.yaml`:

```yaml
emit:
  - "@azure-tools/typespec-metadata"
```

### Options

The emitter supports the following options:

- `output-dir`: Output directory for the generated metadata files (default: `tsp-output`)
- `output-file`: Output filename (default: `typespec-metadata.yaml`)

Example:

```yaml
emit:
  - "@azure-tools/typespec-metadata"
options:
  "@azure-tools/typespec-metadata":
    output-dir: "./metadata"
    output-file: "api-metadata.yaml"
```

## Output

The emitter generates structured metadata in YAML or JSON format that includes:

- Type definitions
- Operations and routes
- Models and enums
- Documentation comments
- Decorators and metadata

This metadata is used by tools like APIView for API review and comparison.
