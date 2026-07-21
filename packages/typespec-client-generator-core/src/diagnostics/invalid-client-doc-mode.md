This diagnostic is issued when `@clientDoc` receives a mode whose value is not `"append"` or `"replace"`.

To fix this issue, pass `DocumentationMode.append` or `DocumentationMode.replace` to `@clientDoc`.

### Example

```typespec
using Azure.ClientGenerator.Core;

enum CustomDocMode {
  prepend: "prepend",
}

@clientDoc("Client-specific text.", CustomDocMode.prepend)
model Widget {}
```

Use `DocumentationMode.append` or `DocumentationMode.replace` instead of a custom mode.
