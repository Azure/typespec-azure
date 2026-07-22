This diagnostic is issued when `@clientDoc` receives a mode whose value is not `"append"` or `"replace"`.

## Impact

- **Area:** Generated SDK documentation customization. Blocks the `@clientDoc` override because TCGC cannot decide whether to append or replace documentation.
- **Not affected:** SDK type names, operation signatures, and service behavior are unchanged.

#### ❌ Incorrect Usage

```typespec
enum CustomDocMode {
  prepend: "prepend",
}

@clientDoc("Client-specific text.", CustomDocMode.prepend)
model Widget {}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Invalid mode 'prepend' for @clientDoc decorator. Valid values are "append" or "replace".
```

#### ✅ How to Fix

Pass `DocumentationMode.append` or `DocumentationMode.replace` to `@clientDoc`.
