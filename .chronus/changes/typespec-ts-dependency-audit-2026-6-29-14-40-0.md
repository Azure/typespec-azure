---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Remove unused `handlebars` and `mkdirp` dependencies. README, snippets, sample-test, and recorded-client metadata files now use a small built-in template renderer instead of Handlebars, and the test-server scripts create the coverage directory with Node instead of `mkdirp`. Also drop dead metadata templates (`karmaConfig`, the non-branded README template) that were no longer emitted.
