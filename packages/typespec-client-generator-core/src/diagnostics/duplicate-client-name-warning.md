This diagnostic is issued when two generated SDK declarations share the same client name. This is by design for languages such as C# that use the duplicated name to produce overloads.

To fix this issue, confirm that the duplicated name is intentional for the target language's overloading behavior and suppress this diagnostic; otherwise give the declarations unique names, for example with `@clientName`.

### Example

When the duplicate is an intentional overload, suppress the diagnostic:

```typespec
interface StorageTasks {
  @route("/list")
  list(): void;

  #suppress "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning" "Intentional overload for C#"
  @clientName("list", "csharp")
  @route("/listByParent")
  listByParent(parent: string): void;
}
```

For the C# emitter, both operations resolve to the client name `list`; suppress the diagnostic when the overload is intentional, otherwise choose a distinct `@clientName`.
