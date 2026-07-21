---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Fix the example generator emitting uncompilable Go for `utcDateTime` properties encoded as `rfc7231`. The `RFC7231` time format now maps to the Go `time.RFC1123` layout (`time.Parse`) instead of falling through to the Unix-timestamp `strconv.ParseInt` path.