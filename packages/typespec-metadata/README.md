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

- `output-file`: Output filename (default: `typespec-metadata.yaml` for YAML, `typespec-metadata.json` for JSON)
- `format`: Output format - either `"yaml"` or `"json"` (default: `"yaml"`)

Example (YAML output):

```yaml
emit:
  - "@azure-tools/typespec-metadata"
options:
  "@azure-tools/typespec-metadata":
    output-file: "api-metadata.yaml"
    format: "yaml"
```

Example (JSON output):

```yaml
emit:
  - "@azure-tools/typespec-metadata"
options:
  "@azure-tools/typespec-metadata":
    output-file: "api-metadata.json"
    format: "json"
```

## Output

The emitter generates structured metadata in YAML or JSON format. This metadata is used by tools like APIView for API review and comparison.

Here is an example using KeyVault Keys:

```yaml
emitterVersion: 0.1.0
generatedAt: 2026-01-15T23:14:08.554Z
typespec:
  namespace: KeyVault
  documentation: The key vault client performs cryptographic key operations and vault operations against the Key Vault service.
  type: data
languages:
  python:
    emitterName: "@azure-tools/typespec-python"
    packageName: azure-keyvault-keys
    namespace: azure.keyvault.keys
    outputDir: "{output-dir}/sdk/keyvault/azure-keyvault-keys"
    flavor: azure
    serviceDir: sdk/keyvault
  java:
    emitterName: "@azure-tools/typespec-java"
    packageName: azure-security-keyvault-keys
    namespace: com.azure.security.keyvault.keys
    outputDir: "{output-dir}/sdk/keyvault/azure-security-keyvault-keys"
    flavor: azure
    serviceDir: sdk/keyvault
  typescript:
    emitterName: "@azure-tools/typespec-ts"
    packageName: "@azure/keyvault-keys"
    namespace: "@azure/keyvault-keys"
    outputDir: "{output-dir}/sdk/keyvault/keyvault-keys"
    flavor: azure
    serviceDir: sdk/keyvault
  go:
    emitterName: "@azure-tools/typespec-go"
    packageName: sdk/security/keyvault/azkeys
    namespace: sdk/security/keyvault/azkeys
    outputDir: "{output-dir}/sdk/security/keyvault/azkeys"
    serviceDir: sdk/security/keyvault
  rust:
    emitterName: "@azure-tools/typespec-rust"
    packageName: azure_security_keyvault_keys
    namespace: azure_security_keyvault_keys
    outputDir: "{output-dir}/sdk/keyvault/azure_security_keyvault_keys"
    serviceDir: sdk/keyvault
sourceConfigPath: C:/repos/azure-rest-api-specs/specification/keyvault/Security.KeyVault.Keys/tspconfig.yaml
```
