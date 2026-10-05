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

Omitted from this fixture (present in the real `QueueStorage` directory but not needed for a
`tsp compile` of this slice): `examples/`, `readme.md`, `service.yaml`, `suppressions.yaml`,
`tspconfig.yaml` — those are AutoRest/spec-repo tooling config, not part of the TypeSpec surface
itself.
