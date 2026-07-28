---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Render bullet and numbered lists in doc comments following the native Go doc convention: list items are indented with aligned continuation lines, blank lines are preserved, and a blank comment line is inserted around lists so `go doc`/`gofmt` recognize them.
