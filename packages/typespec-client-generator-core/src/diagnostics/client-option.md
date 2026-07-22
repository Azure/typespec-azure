This diagnostic is always issued when `@clientOption` is used, because client options are a temporary mechanism intended only for language emitters.

To fix this issue, double-check whether the client option reflects an intended language-emitter behavior. If it does, suppress this diagnostic; otherwise remove `@clientOption`.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service
namespace MyService;

@clientOption("enableFeatureFoo", true, "python")
model Test {
  id: string;
}
```

`@clientOption` always reports this diagnostic because it is experimental; remove it or suppress the warning with a temporary-workaround justification.
