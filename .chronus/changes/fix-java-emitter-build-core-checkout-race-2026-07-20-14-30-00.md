---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Fix the emitter build hanging during a full repo `pnpm build`. `Copy-Sources.ps1` no longer checks out the pinned `core/` commit in place (which mutated the shared submodule working tree and raced with the concurrent monorepo build / `regen-all-packages-docs`); it now reads the pinned sources with `git archive`, leaving the `core/` checkout untouched.
