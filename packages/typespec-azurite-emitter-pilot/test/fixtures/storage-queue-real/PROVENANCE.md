# Provenance

The four `.tsp` files in this directory (`main.tsp`, `models.tsp`, `routes.tsp`, `client.tsp`) are
**vendored verbatim, byte-for-byte unchanged**, from the real Azure Storage Queue TypeSpec:

- Source repository: https://github.com/Azure/azure-rest-api-specs (copied from a local checkout
  at `iscai-msft/azure-rest-api-specs`, which tracks that upstream)
- Path: `specification/storage/data-plane/QueueStorage/{main,models,routes,client}.tsp`
- Commit: `85d7676f040b7a29c22517db77a0ac0fd6b8e496` (local checkout `HEAD` at copy time; verify
  this hash directly against `azure-rest-api-specs` main if you need to confirm currency)
- Copied: 2026 (same day as this fixture's addition — see this package's changelog/git history)

**Do not hand-edit these four files.** They exist here to prove this pilot emitter can consume
the real, unmodified Storage TypeSpec — not a simplified stand-in — which is the core constraint
of the proposed Azurite migration (the shared Storage TypeSpec is never edited for Azurite's
sake; emulator-specific behavior is layered on top via a separate overlay file, see
`azurite.tsp` in this same directory). If the upstream spec changes, re-copy these four files
verbatim and update the commit hash above; do not patch them in place.

**Verified byte-for-byte identical to the cited source commit** (re-confirmed after discovering
that an earlier `pnpm format` run had reflowed `routes.tsp`/`client.tsp` — see the
`.prettierignore` entry for this directory added to prevent recurrence):

```bash
$ SRC=/path/to/azure-rest-api-specs/specification/storage/data-plane/QueueStorage
$ diff -q main.tsp "$SRC/main.tsp"      # no output -> identical
$ diff -q models.tsp "$SRC/models.tsp"  # no output -> identical
$ diff -q routes.tsp "$SRC/routes.tsp"  # no output -> identical
$ diff -q client.tsp "$SRC/client.tsp"  # no output -> identical
```

All four commands produced no output (i.e. `diff -q` found zero differences) when last checked.
Because this repo's root Prettier config would otherwise reformat `.tsp` files on `pnpm format`,
`packages/typespec-azurite-emitter-pilot/test/fixtures/storage-queue-real/*.tsp` is listed in the
repo root's `.prettierignore`, mirroring the existing precedent for `typespec-java`'s
upstream-synced fixtures in that same file.

Omitted from this fixture (present in the real `QueueStorage` directory but not needed for a
`tsp compile` of this slice): `examples/`, `readme.md`, `service.yaml`, `suppressions.yaml`,
`tspconfig.yaml` — those are AutoRest/spec-repo tooling config, not part of the TypeSpec surface
itself.
