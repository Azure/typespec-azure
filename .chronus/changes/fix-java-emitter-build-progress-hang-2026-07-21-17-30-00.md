---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Fix the Java emitter build intermittently hanging a full parallel `pnpm build`. The build scripts run under turbo, which puts each task in a background process group under the build's controlling terminal; when a PowerShell cmdlet (notably `Copy-Item -Recurse`) rendered `Write-Progress`, pwsh touched that terminal and the OS stopped it with SIGTTIN/SIGTTOU, hanging forever. The `.ps1` build scripts now set `$ProgressPreference = 'SilentlyContinue'`. Also make the pinned-`core/` fetch conditional (only when the commit is missing) and non-interactive (`GIT_TERMINAL_PROMPT=0`, `pwsh -NonInteractive`) to remove secondary hang/network vectors.
