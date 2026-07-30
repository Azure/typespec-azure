---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Fix the emitter build hanging during a full repo `pnpm build`. `Copy-Sources.ps1` no longer checks out the pinned `core/` commit in place (which mutated the shared submodule working tree and raced with the concurrent monorepo build / `regen-all-packages-docs`); it now reads the pinned sources with `git archive`, leaving the `core/` checkout untouched. It also no longer copies the ~38MB of `http-client-generator-test` / `http-client-generator-clientcore-test` sources that are not part of the emitter.jar build, cutting the generator copy time from ~17s to ~2s.
