# SDK Generated-Code Smoke Tests

Regenerates a small set of **real** spec-repo services against the current
in-repo TypeSpec/TCGC/emitter code and fails when the generated SDK code drifts
from the committed baseline. This catches unintended generated-code changes from
upstream codegen changes early, in the PR that causes them.

## Config: `smoke-test-config.json`

- `commit` — a single `Azure/azure-rest-api-specs` commit that **all** services
  are fetched from. Bump deliberately; it produces one reviewable PR.
- `services[]` — `name` (snapshot folder), `specPath` (folder in the spec repo
  containing `main.tsp`/`client.tsp`), and `scenarios` (coverage metadata).

### Selection criteria
Pick services that together exercise the major generation paths: ARM + data-plane,
LRO, paging, discriminators/polymorphism, versioning, and large model graphs.
Compute is the primary ARM service (LRO + paging + discriminators + big models).

## Commands (Python)

```bash
# regenerate snapshots in place
pnpm --filter @azure-tools/typespec-python run regenerate:smoke

# regenerate + fail on any diff (CI)
pnpm --filter @azure-tools/typespec-python run regenerate:smoke -- --check
```

## Updating the baseline
Run the regenerate command and commit the changed
`packages/typespec-python/smoke-test/generated/**`. To move to newer specs,
change `commit` in the config, regenerate, and commit.

> CI triggering (when/where these run) is tracked in a separate issue.
