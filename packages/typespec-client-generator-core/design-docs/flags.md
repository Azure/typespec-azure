# TCGC `tspconfig.yaml` flags

## 1. `generate-protocol-methods`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.

## 2. `generate-convenience-methods`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.

## 3. `package-name`

The `package-name` override you would like for your generated library. By default individual language emitters should calculate the package name for their library from the `SdkPackage.namespaces` that `tcgc` returns to them.

Currently, emitters don't really use it, but it would be great to move language emitters to use this flag. Java should be excluded from this list because it doesn't apply to their naming structure.

Should remove any logic that derives namespace names from the value of `package-name`.

Default value is `undefined`.

## 4. `flatten-union-as-enum`

Whether you want TCGC to return unions of strings as enums. Default value is `true`. I feel this should not be a `tspconfig.yaml` flag, but an option you can pass to TCGC when calling `createSdkContext`

## 5. `examples-dir`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

## 6. `emitter-name`

The name of the emitter you are calling TCGC from. TCGC uses this to keep track of what scope you belong to, and what information to set for you. I feel we should remove this from `tspconfig.yaml`. It is currently the second optional argument to pass to `createSdkContext`, which I think is the only place you should be able to pass it in

## 7. `namespace`

If you want to override the namespaces set in the spec. In the process of adding, see [this](https://github.com/Azure/typespec-azure/pull/2161) PR. Affects the values in `SdkPackage.namespaces`.

## 8. `api-version`

Use this flag if you would like to generate the sdk only for a specific version. Default value is `all`. Also accepts values `latest` and `all`.
