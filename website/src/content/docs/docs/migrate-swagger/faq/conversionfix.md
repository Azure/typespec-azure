---
title: Fixing Converted TypeSpec
---

## Fixing Linter Rules

Ideally, the original Swagger will be converted into equivalent TypeSpec following ARM conventions. However, many Swagger specifications predate current ARM conventions  and are 'grandfathered in' to prevent breaking changes. The  equivalent TypeSpec that represents the original Swagger will violate linter rules, and linter suppressions are added. Check out how to fix linter violations below.

### @azure-tools/typespec-azure-core/no-openapi

The `operationId` in Swagger is usually formatted as `OperationGroup_OperationName`. Use [`@clientLocation`](https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/reference/decorators/#@Azure.ClientGenerator.Core.clientLocation) to specify the operation group and [`@clientName`](https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/reference/decorators/#@Azure.ClientGenerator.Core.clientName) to change the operation name if needed.

**Before:**

```typespec
interface Employees {
  @operationId("OperationGroup_Get")
  get is ArmResourceRead<Employee>;
}
```

**After:**

```typespec
interface Employees {
  get is ArmResourceRead<Employee>;
}

@Azure.ClientGenerator.Core.clientLocation(Employees.get, "OperationGroup");
// Note: @clientName is not needed here because the operation name "get"
// matches the "Get" part of the original operationId
```
