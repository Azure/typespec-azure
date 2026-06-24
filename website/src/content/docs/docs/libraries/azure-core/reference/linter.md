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

| Name                                                                                                                              | Description                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@azure-tools/typespec-azure-core/operation-missing-api-version`](../rules/operation-missing-api-version.md)                     | Operations need an api version parameter.                                                                                                            |
| [`@azure-tools/typespec-azure-core/auth-required`](../rules/auth-required.md)                                                     | Enforce service authentication.                                                                                                                      |
| [`@azure-tools/typespec-azure-core/request-body-problem`](../rules/request-body-problem.md)                                       | Request body should not be of raw array type.                                                                                                        |
| [`@azure-tools/typespec-azure-core/byos`](../rules/byos.md)                                                                       | Use the BYOS pattern recommended for Azure Services.                                                                                                 |
| [`@azure-tools/typespec-azure-core/casing-style`](../rules/casing-style.md)                                                       | Ensure proper casing style.                                                                                                                          |
| [`@azure-tools/typespec-azure-core/composition-over-inheritance`](../rules/composition-over-inheritance.md)                       | Check that if a model is used in an operation and has derived models that it has a discriminator or recommend to use composition via spread or `is`. |
| [`@azure-tools/typespec-azure-core/known-encoding`](../rules/known-encoding.md)                                                   | Check for supported encodings.                                                                                                                       |
| [`@azure-tools/typespec-azure-core/long-running-polling-operation-required`](../rules/long-running-polling-operation-required.md) | Long-running operations should have a linked polling operation.                                                                                      |
| [`@azure-tools/typespec-azure-core/no-case-mismatch`](../rules/no-case-mismatch.md)                                               | Validate that no two types have the same name with different casing.                                                                                 |
| [`@azure-tools/typespec-azure-core/no-closed-literal-union`](../rules/no-closed-literal-union.md)                                 | Unions of literals should include the base scalar type to mark them as open enum.                                                                    |
| [`@azure-tools/typespec-azure-core/no-enum`](../rules/no-enum.md)                                                                 | Azure services should not use enums.                                                                                                                 |
| [`@azure-tools/typespec-azure-core/no-error-status-codes`](../rules/no-error-status-codes.md)                                     | Recommend using the error response defined by Azure REST API guidelines.                                                                             |
| [`@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops`](../rules/no-explicit-routes-resource-ops.md)                 | The @route decorator should not be used on standard resource operation signatures.                                                                   |
| [`@azure-tools/typespec-azure-core/non-breaking-versioning`](../rules/non-breaking-versioning.md)                                 | Check that only backward compatible versioning change are done to a service.                                                                         |
| [`@azure-tools/typespec-azure-core/no-generic-numeric`](../rules/no-generic-numeric.md)                                           | Don't use generic types. Use more specific types instead.                                                                                            |
| [`@azure-tools/typespec-azure-core/no-nullable`](../rules/no-nullable.md)                                                         | Use `?` for optional properties.                                                                                                                     |
| [`@azure-tools/typespec-azure-core/no-offsetdatetime`](../rules/no-offsetdatetime.md)                                             | Prefer using `utcDateTime` when representing a datetime unless an offset is necessary.                                                               |
| [`@azure-tools/typespec-azure-core/no-response-body`](../rules/no-response-body.md)                                               | Ensure that the body is set correctly for the response type.                                                                                         |
| [`@azure-tools/typespec-azure-core/no-rpc-path-params`](../rules/no-rpc-path-params.md)                                           | Operations defined using RpcOperation should not have path parameters.                                                                               |
| [`@azure-tools/typespec-azure-core/no-openapi`](../rules/no-openapi.md)                                                           | Azure specs should not be using decorators from @typespec/openapi or @azure-tools/typespec-autorest                                                  |
| [`@azure-tools/typespec-azure-core/no-unnamed-union`](../rules/no-unnamed-union.md)                                               | Azure services should not define a union expression but create a declaration.                                                                        |
| [`@azure-tools/typespec-azure-core/no-header-explode`](../rules/no-header-explode.md)                                             | It is recommended to serialize header parameter without explode: true                                                                                |
| [`@azure-tools/typespec-azure-core/no-format`](../rules/no-format.md)                                                             | Azure services should not use the `@format` decorator.                                                                                               |
| [`@azure-tools/typespec-azure-core/no-multiple-discriminator`](../rules/no-multiple-discriminator.md)                             | Classes should have at most one discriminator.                                                                                                       |
| [`@azure-tools/typespec-azure-core/no-rest-library-interfaces`](../rules/no-rest-library-interfaces.md)                           | Resource interfaces from the TypeSpec.Rest.Resource library are incompatible with Azure.Core.                                                        |
| [`@azure-tools/typespec-azure-core/no-unknown`](../rules/no-unknown.md)                                                           | Azure services must not have properties of type `unknown`.                                                                                           |
| [`@azure-tools/typespec-azure-core/bad-record-type`](../rules/bad-record-type.md)                                                 | Identify bad record definitions.                                                                                                                     |
| [`@azure-tools/typespec-azure-core/documentation-required`](../rules/documentation-required.md)                                   | Require documentation over enums, models, and operations.                                                                                            |
| [`@azure-tools/typespec-azure-core/key-visibility-required`](../rules/key-visibility-required.md)                                 | Key properties need to have a Lifecycle visibility setting.                                                                                          |
| [`@azure-tools/typespec-azure-core/response-schema-problem`](../rules/response-schema-problem.md)                                 | Warn about operations having multiple non-error response schemas.                                                                                    |
| [`@azure-tools/typespec-azure-core/rpc-operation-request-body`](../rules/rpc-operation-request-body.md)                           | Warning for RPC body problems.                                                                                                                       |
| [`@azure-tools/typespec-azure-core/spread-discriminated-model`](../rules/spread-discriminated-model.md)                           | Check a model with a discriminator has not been used in composition.                                                                                 |
| [`@azure-tools/typespec-azure-core/use-standard-names`](../rules/use-standard-names.md)                                           | Use recommended names for operations.                                                                                                                |
| [`@azure-tools/typespec-azure-core/use-standard-operations`](../rules/use-standard-operations.md)                                 | Operations should be defined using a signature from the Azure.Core namespace.                                                                        |
| [`@azure-tools/typespec-azure-core/no-string-discriminator`](../rules/no-string-discriminator.md)                                 | Azure services discriminated models should define the discriminated property as an extensible union.                                                 |
| [`@azure-tools/typespec-azure-core/require-versioned`](../rules/require-versioned.md)                                             | Azure services should use the versioning library.                                                                                                    |
| [`@azure-tools/typespec-azure-core/friendly-name`](../rules/friendly-name.md)                                                     | Ensures that @friendlyName is used as intended.                                                                                                      |
| [`@azure-tools/typespec-azure-core/no-private-usage`](../rules/no-private-usage.md)                                               | Verify that elements inside Private namespace are not referenced.                                                                                    |
| [`@azure-tools/typespec-azure-core/no-legacy-usage`](../rules/no-legacy-usage.md)                                                 | Linter warning against using elements from the Legacy namespace                                                                                      |
| [`@azure-tools/typespec-azure-core/no-query-explode`](../rules/no-query-explode.md)                                               | It is recommended to serialize query parameter without explode: true                                                                                 |
| [`@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch`](../rules/no-route-parameter-name-mismatch.md)               | Ensure that operations with the same path use consistent path parameter names.                                                                       |
