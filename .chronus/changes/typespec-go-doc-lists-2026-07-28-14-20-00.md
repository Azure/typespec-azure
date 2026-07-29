---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Render bullet and numbered lists in doc comments following the native Go doc convention: list items are indented with aligned continuation lines, and a blank comment line is inserted around lists so `go doc`/`gofmt` recognize them. Emitted comments are byte-identical to what `gofmt` produces, including for docs that consist solely of a list. Nested (multi-level) lists are not supported, since the Go doc comment format has no concept of them.
