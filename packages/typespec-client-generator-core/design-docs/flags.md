# TCGC `tspconfig.yaml` flags

## 1. `generate-protocol-methods`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.

## 2. `generate-convenience-methods`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.

## 3. `flatten-union-as-enum`

Whether you want TCGC to return unions of strings as enums. Default value is `true`. I feel this should not be a `tspconfig.yaml` flag, but an option you can pass to TCGC when calling `createSdkContext`

## 4. `examples-dir`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

## 5. `namespace`

If you want to override the namespaces set in the spec. In the process of adding, see [this](https://github.com/Azure/typespec-azure/pull/2161) PR. Affects the values in `SdkPackage.namespaces`.

## 6. `api-version`

Use this flag if you would like to generate the sdk only for a specific version. Default value is `all`. Also accepts values `latest` and `all`.
