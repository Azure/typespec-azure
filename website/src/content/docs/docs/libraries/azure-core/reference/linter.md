---
title: "Linter usage"
---

## Usage

Add the following in `tspconfig.yaml`:

```yaml
linter:
  extends:
    - "@azure-tools/typespec-azure-core/all"
```

## RuleSets

Available ruleSets:

- `@azure-tools/typespec-azure-core/all`
- `@azure-tools/typespec-azure-core/canonical-versioning`

## Rules

| Name                                                                                                                             | Description                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@azure-tools/typespec-azure-core/operation-missing-api-version`](/libraries/azure-core/rules/operation-missing-api-version.md) | Operations need an api version parameter.                                                                                                            |
| [`@azure-tools/typespec-azure-core/auth-required`](/libraries/azure-core/rules/auth-required.md)                                 | Enforce service authentication.                                                                                                                      |
| `@azure-tools/typespec-azure-core/request-body-problem`                                                                          | Request body should not be of raw array type.                                                                                                        |
| `@azure-tools/typespec-azure-core/byos`                                                                                          | Use the BYOS pattern recommended for Azure Services.                                                                                                 |
| [`@azure-tools/typespec-azure-core/casing-style`](/libraries/azure-core/rules/casing-style.md)                                   | Ensure proper casing style.                                                                                                                          |
| `@azure-tools/typespec-azure-core/composition-over-inheritance`                                                                  | Check that if a model is used in an operation and has derived models that it has a discriminator or recommend to use composition via spread or `is`. |
| `@azure-tools/typespec-azure-core/known-encoding`                                                                                | Check for supported encodings.                                                                                                                       |
| `@azure-tools/typespec-azure-core/long-running-polling-operation-required`                                                       | Long-running operations should have a linked polling operation.                                                                                      |
| [`@azure-tools/typespec-azure-core/no-closed-literal-union`](/libraries/azure-core/rules/no-closed-literal-union.md)             | Unions of literals should include the base scalar type to mark them as open enum.                                                                    |
| [`@azure-tools/typespec-azure-core/no-enum`](/libraries/azure-core/rules/no-enum.md)                                             | Azure services should not use enums.                                                                                                                 |
| `@azure-tools/typespec-azure-core/no-error-status-codes`                                                                         | Recommend using the error response defined by Azure REST API guidelines.                                                                             |
| `@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops`                                                               | The @route decorator should not be used on standard resource operation signatures.                                                                   |
| [`@azure-tools/typespec-azure-core/non-breaking-versioning`](/libraries/azure-core/rules/non-breaking-versioning.md)             | Check that only backward compatible versioning change are done to a service.                                                                         |
| [`@azure-tools/typespec-azure-core/no-generic-numeric`](/libraries/azure-core/rules/no-generic-numeric.md)                       | Don't use generic types. Use more specific types instead.                                                                                            |
| [`@azure-tools/typespec-azure-core/no-nullable`](/libraries/azure-core/rules/no-nullable.md)                                     | Use `?` for optional properties.                                                                                                                     |
| `@azure-tools/typespec-azure-core/no-offsetdatetime`                                                                             | Prefer using `utcDateTime` when representing a datetime unless an offset is necessary.                                                               |
| `@azure-tools/typespec-azure-core/no-response-body`                                                                              | Ensure that the body is set correctly for the response type.                                                                                         |
| `@azure-tools/typespec-azure-core/no-rpc-path-params`                                                                            | Operations defined using RpcOperation should not have path parameters.                                                                               |
| `@azure-tools/typespec-azure-core/no-openapi`                                                                                    | Azure specs should not be using decorators from @typespec/openapi or @azure-tools/typespec-autorest                                                  |
| `@azure-tools/typespec-azure-core/prefer-csv-collection-format`                                                                  | It is recommended to use "csv" for collection format of parameters.                                                                                  |
| [`@azure-tools/typespec-azure-core/no-format`](/libraries/azure-core/rules/prevent-format.md)                                    | Azure services should not use the `@format` decorator.                                                                                               |
| `@azure-tools/typespec-azure-core/no-multiple-discriminator`                                                                     | Classes should have at most one discriminator.                                                                                                       |
| `@azure-tools/typespec-azure-core/no-rest-library-interfaces`                                                                    | Resource interfaces from the TypeSpec.Rest.Resource library are incompatible with Azure.Core.                                                        |
| `@azure-tools/typespec-azure-core/no-unknown`                                                                                    | Azure services must not have properties of type `unknown`.                                                                                           |
| `@azure-tools/typespec-azure-core/property-name-conflict`                                                                        | Avoid naming conflicts between a property and a model of the same name.                                                                              |
| [`@azure-tools/typespec-azure-core/bad-record-type`](/libraries/azure-core/rules/bad-record-type.md)                             | Identify bad record definitions.                                                                                                                     |
| `@azure-tools/typespec-azure-core/documentation-required`                                                                        | Require documentation over enums, models, and operations.                                                                                            |
| `@azure-tools/typespec-azure-core/key-visibility-required`                                                                       | Key properties need to have an explicit visibility setting.                                                                                          |
| `@azure-tools/typespec-azure-core/response-schema-problem`                                                                       | Warn about operations having multiple non-error response schemas.                                                                                    |
| `@azure-tools/typespec-azure-core/rpc-operation-request-body`                                                                    | Warning for RPC body problems.                                                                                                                       |
| [`@azure-tools/typespec-azure-core/spread-discriminated-model`](/libraries/azure-core/rules/spread-discriminated-model.md)       | Check a model with a discriminator has not been used in composition.                                                                                 |
| `@azure-tools/typespec-azure-core/use-standard-names`                                                                            | Use recommended names for operations.                                                                                                                |
| [`@azure-tools/typespec-azure-core/use-standard-operations`](/libraries/azure-core/rules/use-standard-operations.md)             | Operations should be defined using a signature from the Azure.Core namespace.                                                                        |
| [`@azure-tools/typespec-azure-core/no-string-discriminator`](/libraries/azure-core/rules/no-string-discriminator.md)             | Azure services discriminated models should define the discriminated property as an extensible union.                                                 |
| [`@azure-tools/typespec-azure-core/require-versioned`](/libraries/azure-core/rules/require-versioned.md)                         | Azure services should use the versioning library.                                                                                                    |
| `@azure-tools/typespec-azure-core/friendly-name`                                                                                 | Ensures that @friendlyName is used as intended.                                                                                                      |
| [`@azure-tools/typespec-azure-core/no-private-usage`](/libraries/azure-core/rules/no-private-usage.md)                           | Verify that elements inside Private namespace are not referenced.                                                                                    |
| [`@azure-tools/typespec-azure-core/no-query-explode`](/libraries/azure-core/rules/no-query-explode.md)                           | It is recommended to serialize query parameter without explode: true                                                                                 |
