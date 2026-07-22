A property whose name matches its enclosing model's name causes problems with
some language emitters (notably C#), where the generated property would
collide with the type name. Rename the property, or use `@clientName` to
rename it for the affected language.

## Impact

- **Area:** SDK generation, primarily **C#**. A property whose name collides with its enclosing model's name produces code that does not compile in C# (applies to both data-plane and management-plane).
- **Not affected:** The service definition and the wire protocol are unchanged; the collision only affects the generated client code.

## Severity

`warning` — suppressible. Although reported as a warning, it should be treated as a must-fix for the C# SDK: leaving the conflict in place produces C# code that fails to compile.

## Diagnostic message

```text
Property 'widget' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.
```

**What it means:** A property's C#-resolved name is the same (case-insensitively) as its enclosing model's C#-resolved name.

**Why it matters:** In C#, a member cannot have the same name as its containing type, so the generated model does not compile. This blocks building the C# SDK.

**Recommended fix:** Rename the property, or keep the TypeSpec name and rename it for C# only with `@clientName("<newName>", "csharp")`.

#### ❌ Incorrect

```tsp
model Widget {
  widget: string;
}
```

#### ✅ Correct (rename the property)

```tsp
model Widget {
  name: string;
}
```

#### ✅ Correct (rename only for C#)

```tsp
model Widget {
  @clientName("widgetName", "csharp")
  widget: string;
}
```

## Suppression

Because this conflict breaks C# generation, suppressing the rule is discouraged. Only suppress it if the affected model is never generated for C#:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/property-name-conflict" "model not generated for C#"
model Widget {
  widget: string;
}
```
