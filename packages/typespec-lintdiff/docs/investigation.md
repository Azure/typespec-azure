# LintDiff → TypeSpec migration: review notes

Review of the "Migrate Swagger LintDiff to TypeSpec lints" plan, based on the
`feature/lintdiff-migration` branch of `Azure/typespec-azure` and the ARM coverage
gist https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a.

## Proposals

### Prove parity by real-service equivalence, not co-occurrence

Each migrated TypeSpec lint must be equivalent to its Swagger LintDiff rule.
Project-level co-occurrence does not prove that both rules detect the same
violations. Run both tools on generated Swagger and TypeSpec from a set of real
services, then compare rule counts and diagnostic locations.

The first trial used the fully TypeSpec-authored Microsoft.Fabric service
(`package-2023-11-01`). Production LintDiff reported **53 violations across 3
rules, including 5 errors**, while `tsp compile --no-emit` with the service's own
ruleset reported **0 diagnostics**. One of those rules,
`RequiredPropertiesMissingInResourceModel`, is classified as
`Template-enforced` in `catalog.json` with no mapped TypeSpec lint, yet it still
fires on real TypeSpec-generated Swagger.

The reusable procedure and complete results are recorded in
[real-service-equivalence-check.md](./real-service-equivalence-check.md).

## Questions

### 1 Who reviews a migrated rule, and what does it cost?

The DoD says only "Reviewer approval obtained" and prices zero days.

- Which parties are required sign-off — TypeSpec/compiler owners, the ARM
  reviewer board, specs-repo tooling owners? Two or three groups per rule makes
  review a first-class cost line.
- Rule IDs and messages become public API once a rule lands in the official
  libraries, and naming/wording is where review round-trips accumulate.
- ARM reviewer capacity is shared with spec reviews: 147 rules × 2–3 rounds may
  dominate wall-clock even if dev-days hold.
- How many rounds are assumed, at what latency? Can rules be reviewed in batches?

### 2 Rollout cost in the spec repos is unpriced

The report stops at "added to ruleset" and never covers getting rules enforced.

- **Public specs repo**: 467 ARM projects today (450 at gist time) to triage,
  suppress-or-fix and sequence.
- **Private specs repo**: the same again.
- Severity asymmetry: LintDiff fails only on **new error/fatal**, while a
  TypeSpec lint landing as `error` blocks compilation outright. A like-for-like
  mapping can be far more disruptive than the Swagger original
  (`EnumInsteadOfBoolean` is `warn` today and blocks nothing).
- Is adoption in scope for this programme, or a separate budgeted workstream?

### Other questions

3. **Severity mapping and suppression policy** — LintDiff `error` maps to which
   TypeSpec severity, and should the rollout preserve existing suppressions?

4. **One rule denominator** — the report says 180 ARM/Common rules;
   `catalog.json` says 209 (172 ARM+common); the coverage gist says 210. The
   three numbers cannot be reconciled from any published artifact, and the work
   breakdown (33 infallible, 86 migrated, 61 pending) is derived from the first
   of them.

   - Which denominator is authoritative, and at which commit?
   - How do the 33/86/61 buckets map onto `catalog.json`'s tiers, which also
     carry a `Template-enforced` tier (43 ARM/Both rules) that the report never
     mentions?

5. **Where does the "450 compiled projects" denominator come from?** 450 = ARM
   TypeSpec projects (`tspconfig.yaml` + `main.tsp` under `specification/**`)
   that compiled successfully; `Fired` is a per-project count, max 450. But the
   gist records no specs commit, timestamp, project list or compile-failure
   count, and the underlying report JSON was never published, so no row is
   auditable. The denominator also drifts — 467 ARM projects locally today.

   - Which specs commit produced the 450?
   - How many projects were skipped or failed to compile, and does excluding
     them bias any rule's parity?
   - Can `cross-repo-comparison.json` be published with the gist?
   - What is the refresh cadence, and is the denominator re-baselined each run?

6. **35 rules never fired** across 450 projects. Retire or defer them with a
   documented rationale instead of migrating them? The report's per-rule
   estimates imply approximately 30–44 dev-days at stake.

7. **Artifact hygiene** — absolute personal paths in `catalog.json`
   (`/Users/wtemple/...`), unnormalized severities (`error`/`warn`/`warning`),
   `validate-report.md` dated 2026-05-04 claiming 254 cases when 431 exist.
