A property whose name matches its enclosing model's name causes problems with
some language emitters (notably C#), where the generated property would
collide with the type name. Rename the property, or use `@clientName` to
rename it for the affected language.

## Impact

- **Area:** SDK generation, primarily **C#**. A property whose name collides with its enclosing model's name produces code that does not compile in C# (applies to both data-plane and management-plane).
- **Not affected:** The service definition and the wire protocol are unchanged; the collision only affects the generated client code.

## ❌ Incorrect Usage

```tsp
model Widget {
  widget: string;
}
```

## Diagnostic Message

For the model above, the linter reports that the property name is the same as its enclosing model name:

```text
Property 'widget' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.
```

## ✅ How to Fix

Rename the property:

```tsp
model Widget {
  name: string;
}
```

Or keep the TypeSpec name and rename it for C# only:

```tsp
model Widget {
  @clientName("widgetName", "csharp")
  widget: string;
}
```

## Suppression

This rule should not be suppressed. Although it is reported as a `warning`, the name conflict breaks C# code generation, so it must be fixed rather than suppressed.
