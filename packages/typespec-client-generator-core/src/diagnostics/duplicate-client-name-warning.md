This diagnostic is issued when two generated SDK declarations share the same client name. This is by design for languages such as C# that use the duplicated name to produce overloads.

## Impact

- **Area:** C# SDK naming and overload generation. Generation continues, but the duplicate generated name should be intentional for C# overload behavior.
- **Not affected:** Other language scopes are unaffected unless the same duplicate name applies to them.

### Decorator-applied duplicate

#### ❌ Incorrect Usage

```typespec
interface StorageTasks {
  @route("/list")
  list(): void;

  @clientName("list", "csharp") // duplicates the C# client name of `list`
  @route("/listByParent")
  listByParent(parent: string): void;
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Client name: "list" is duplicated in language scope: "csharp"
```

#### ✅ How to Fix

Give `listByParent` a distinct C# client name, or suppress the warning if the duplicate intentionally represents an overload.

```typespec
interface StorageTasks {
  @route("/list")
  list(): void;

  @clientName("listByParent", "csharp")
  @route("/listByParent")
  listByParent(parent: string): void;
}
```

### Generated name conflict

#### Diagnostic Message

For the generated operation name above, TCGC reports:

```text
Client name: "list" is defined somewhere causing naming conflicts in language scope: "csharp"
```

#### ✅ How to Fix

Rename one of the generated operations for the affected scope, or suppress the warning when the duplicate is an intentional overload.

## Suppression

Suppress this warning only when the duplicate generated name is intentional for the target emitter, such as a C# overload.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning" "Intentional overload for C#"
```
