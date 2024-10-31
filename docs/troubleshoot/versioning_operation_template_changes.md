---
title: How can I change the operation template of an operation in newer versions
---

## Symtoms

If you are switching to a different operation template in a new version, you may run into compilation errors if you only leverage `@added` and `@removed` versioning decorators.

## Workaround

In the example below, you are switch from an old deprecated operation template to the new one. Note the uses of `@sharedRoute` and `renamedFrom` to avoid name and route conflict errors.

```typespec
  #suppress "deprecated" "back compat"
  @removed(Versions.`2024-10-01-preview`)
  @sharedRoute
  @renamedFrom(Versions.`2024-10-01-preview`, "delete")
  deleteOld is ArmResourceDeleteAsync<Employee>;

  @added(Versions.`2024-10-01-preview`)
  @sharedRoute
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
```

**Please note**: In the `delete is ArmResourceDeleteAsync` example above, if you are RPSaaS service, you CAN do a direct replacement with `delete is ArmResourceDeleteWithoutOkAsync`. This is because RPSaaS will never send `200 OK`. Update in-place is just an API spec bug fix.
