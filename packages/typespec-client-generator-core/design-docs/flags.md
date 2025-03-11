# TCGC `tspconfig.yaml` flags

## 1. `generate-protocol-methods`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.

## 2. `generate-convenience-methods`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.

## 3. `examples-dir`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

## 4. `namespace`

Specifies the namespace you want to override for namespaces set in the spec. With this config, all namespace for the spec types will default to it.

## 5. `api-version`

Use this flag if you would like to generate the sdk only for a specific version. Default value is the latest version. Also accepts values `latest` and `all`.
