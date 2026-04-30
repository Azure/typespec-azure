---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

When an operation's response declares multiple content types (e.g. `Http.File<"image/png" | "image/jpeg">`), the synthetic `accept` parameter is now generated as a single string constant whose value joins all response content types with `, ` (structured content types such as JSON/XML/text-plain are listed first), instead of an enum. This avoids modeling such operations as content negotiation. Use `@sharedRoute` to split an operation if real content negotiation is required.
