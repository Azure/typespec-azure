---
title: "Linter usage"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Linter

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

| Name                                                                                                                 | Description                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@azure-tools/typespec-azure-core/operation-missing-api-version`                                                     | Operations need an api version parameter.                                                                                                            |
| `@azure-tools/typespec-azure-core/auth-required`                                                                     | Enforce service authentication.                                                                                                                      |
| `@azure-tools/typespec-azure-core/request-body-problem`                                                              | Request body should not be of raw array type.                                                                                                        |
| `@azure-tools/typespec-azure-core/byos`                                                                              | Use the BYOS pattern recommended for Azure Services.                                                                                                 |
| `@azure-tools/typespec-azure-core/casing-style`                                                                      | Ensure proper casing style.                                                                                                                          |
| `@azure-tools/typespec-azure-core/composition-over-inheritance`                                                      | Check that if a model is used in an operation and has derived models that it has a discriminator or recommend to use composition via spread or `is`. |
| `@azure-tools/typespec-azure-core/use-extensible-enum`                                                               | Enums should be extensible.                                                                                                                          |
| `@azure-tools/typespec-azure-core/known-encoding`                                                                    | Check for supported encodings.                                                                                                                       |
| `@azure-tools/typespec-azure-core/long-running-polling-operation-required`                                           | Long-running operations should have a linked polling operation.                                                                                      |
| [`@azure-tools/typespec-azure-core/no-closed-literal-union`](/libraries/azure-core/rules/no-closed-literal-union.md) | Unions of literals should include the base scalar type to mark them as open enum.                                                                    |
| [`@azure-tools/typespec-azure-core/no-enum`](/libraries/azure-core/rules/no-enum.md)                                 | Azure services should not use enums.                                                                                                                 |
| `@azure-tools/typespec-azure-core/no-error-status-codes`                                                             | Recommend using the error response defined by Azure REST API guidelines.                                                                             |
| `@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops`                                                   | The @route decorator should not be used on standard resource operation signatures.                                                                   |
| `@azure-tools/typespec-azure-core/no-fixed-enum-discriminator`                                                       | Discriminator shouldn't be a fixed enum.                                                                                                             |
| [`@azure-tools/typespec-azure-core/non-breaking-versioning`](/libraries/azure-core/rules/non-breaking-versioning.md) | Check that only backward compatible versioning change are done to a service.                                                                         |
| `@azure-tools/typespec-azure-core/no-nullable`                                                                       | Use `?` for optional properties.                                                                                                                     |
| `@azure-tools/typespec-azure-core/no-offsetdatetime`                                                                 | Prefer using `utcDateTime` when representing a datetime unless an offset is necessary.                                                               |
| `@azure-tools/typespec-azure-core/no-response-body`                                                                  | Ensure that the body is set correctly for the response type.                                                                                         |
| `@azure-tools/typespec-azure-core/no-rpc-path-params`                                                                | Operations defined using RpcOperation should not have path parameters.                                                                               |
| `@azure-tools/typespec-azure-core/no-operation-id`                                                                   | Operation ID is automatically generated by the OpenAPI emitters and should not normally be specified.                                                |
| `@azure-tools/typespec-azure-core/prefer-csv-collection-format`                                                      | It is recommended to use "csv" for collection format of parameters.                                                                                  |
| `@azure-tools/typespec-azure-core/no-format`                                                                         | Azure services should not use the `@format` decorator.                                                                                               |
| `@azure-tools/typespec-azure-core/no-multiple-discriminator`                                                         | Classes should have at most one discriminator.                                                                                                       |
| `@azure-tools/typespec-azure-core/no-rest-library-interfaces`                                                        | Resource interfaces from the TypeSpec.Rest.Resource library are incompatible with Azure.Core.                                                        |
| `@azure-tools/typespec-azure-core/no-unknown`                                                                        | Azure services must not have properties of type `unknown`.                                                                                           |
| `@azure-tools/typespec-azure-core/property-name-conflict`                                                            | Avoid naming conflicts between a property and a model of the same name.                                                                              |
| `@azure-tools/typespec-azure-core/bad-record-type`                                                                   | Identify bad record definitions.                                                                                                                     |
| `@azure-tools/typespec-azure-core/documentation-required`                                                            | Require documentation over enums, models, and operations.                                                                                            |
| `@azure-tools/typespec-azure-core/key-visibility-required`                                                           | Key properties need to have an explicit visibility setting.                                                                                          |
| `@azure-tools/typespec-azure-core/response-schema-problem`                                                           | Warn about operations having multiple non-error response schemas.                                                                                    |
| `@azure-tools/typespec-azure-core/rpc-operation-request-body`                                                        | Warning for RPC body problems.                                                                                                                       |
| `@azure-tools/typespec-azure-core/spread-discriminated-model`                                                        | Check a model with a discriminator has not been used in composition.                                                                                 |
| `@azure-tools/typespec-azure-core/use-standard-names`                                                                | Use recommended names for operations.                                                                                                                |
| `@azure-tools/typespec-azure-core/use-standard-operations`                                                           | Operations should be defined using a signature from the Azure.Core namespace.                                                                        |
