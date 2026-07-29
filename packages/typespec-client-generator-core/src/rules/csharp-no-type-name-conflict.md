C# generated public type names should not conflict with reserved Azure SDK type names. This rule uses the same reserved-name catalog as the .NET AZC0034 analyzer and reports when a TypeSpec model, enum, or union would generate a C# type with a conflicting simple name.

#### ❌ Incorrect

```tsp
namespace Billing;

model Operation {}
```

#### ✅ Correct

```tsp
namespace Billing;

model Operation {}

@@clientName(Operation, "BillingOperation", "csharp");
```
