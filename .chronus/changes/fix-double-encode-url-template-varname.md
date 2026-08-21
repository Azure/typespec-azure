---
"@azure-tools/typespec-ts": fix
---

Fix double encoding of URI template parameter names for array and record query parameter values (e.g. `$Select` becoming `%2524Select` instead of `%24Select`)
