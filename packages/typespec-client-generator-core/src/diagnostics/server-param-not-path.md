This diagnostic is issued when a server template argument resolves to something other than an HTTP path parameter. Server URL template variables must map to path parameters in the generated endpoint configuration.

## Impact

- **Area:** Endpoint parameter generation. Blocks server URL template parameter conversion when the template argument is not modeled as a path parameter.
- **Not affected:** Operation-level route parameters are unaffected unless they are part of the server template.

## Diagnostic Message

TCGC reports:

```text
Template argument endpoint is not a path parameter, it is a query. It has to be a path.
```

## ✅ How to Fix

Make the template argument a path parameter or update the server URL so it no longer requires that argument.
