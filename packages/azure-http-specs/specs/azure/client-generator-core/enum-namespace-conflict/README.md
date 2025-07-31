# Enum Namespace Conflict Test

This test validates the scenario where enums with the same name exist in different namespaces, which is valid TypeSpec but can cause SDK generation problems.

## Problem Demonstrated

The test shows the issue that occurs when:
- `FirstNamespace.Status` enum exists with values `Active`, `Inactive`
- `SecondNamespace.Status` enum exists with values `Running`, `Stopped`

Without proper handling, SDK generators may generate conflicting types both named `Status`, causing compilation errors or ambiguous references.

## Solution Demonstrated

The `client.tsp` file resolves this by using `@clientName` to rename one of the enums:

```typespec
@@clientName(SecondNamespace.Status, "SecondStatus");
```

This ensures that:
- `FirstNamespace.Status` generates as `Status`
- `SecondNamespace.Status` generates as `SecondStatus`

## Test Structure

- **main.tsp**: Defines the problematic scenario with same-named enums in different namespaces
- **client.tsp**: Resolves the conflict using `@clientName` decorator
- **mockapi.ts**: Provides mock responses for testing both operations

## Operations Tested

1. `FirstOperations.first` - Uses `FirstNamespace.Status`
2. `SecondOperations.second` - Uses `SecondNamespace.Status` (renamed to `SecondStatus` in generated SDKs)

This test ensures SDK generators can handle namespace conflicts properly when appropriate client customizations are provided.