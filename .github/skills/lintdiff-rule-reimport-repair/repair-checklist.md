# Rule re-import repair checklist

Use this checklist to avoid repeating the migration mistakes already seen in this repository.

## Upstream source of truth

- rule documentation
- rule registration entry and severity
- implemented selector or rule logic
- upstream tests
- any `disableForTypeSpec*` hint or other TypeSpec-specific disablement

## Upstream semantic matrix

Break the rule into the behaviors that must be matched locally:

- violating combinations
- compliant combinations
- ignored or filtered shapes
- null / missing-field behavior, if upstream tests cover it
- selector-boundary behavior (what the rule intentionally does **not** inspect)
- any doc-versus-implementation mismatch that changes the true scope

## Local imported state

- `tests/<RuleName>/rule.md`
- local violating fixtures
- local compliant fixtures
- stored `validator-diagnostics.json`
- stored `tsp-diagnostics.json`
- any existing local linter rule and registration
- `validate-report.md`
- `catalog.json` / `CATALOG.md`

## Blocking and prerequisite checks

- `#suppress` directives in local TypeSpec repros
- unrelated TypeSpec diagnostics that already forbid the shape
- template-generated or framework-enforced behavior that makes a new lint redundant
- evidence that the current repro is not authorable without suppressing another rule

## Known repository-specific pitfalls

- Upstream **implementation and tests beat documentation prose** when they disagree.
- `scripts/validate.ts` gets case intent from `tests/<RuleName>/<Case>/expect.json`; without that file, cases default to `violation: true`.
- `tests/<RuleName>/rule.md` still matters because the harness uses it for local lint mapping and migration metadata.
- The local linter package currently emits warning-severity rules only; do not pretend a repaired local rule can already be surfaced as an error.
- `validate-report.md` is only refreshed when validation is run with an explicit `--report-md=validate-report.md`.
- If a local lint mapping is missing from `rule.md`, the targeted compile worker may not load the local linter for that rule.

## Local semantic coverage expectation

- Do not stop at one violating fixture unless the upstream rule really only has one meaningful semantic case.
- Add enough violating, compliant, and ignored-edge fixtures to cover the upstream semantic matrix.
- For each upstream semantic cell, either:
  - cover it with a local authorable TypeSpec fixture, or
  - document clearly why the cell is not representable because of prerequisite TypeSpec diagnostics, template enforcement, or emitter limits.
- If important upstream semantic cells remain unrepresented, treat the local state as **partial**, **blocked**, or **test-quality issue** rather than complete.

## Repair decision

Pick the strongest evidence-backed result:

- already correct
- already covered
- blocked or suppression-dependent
- test-quality issue
- partial import needing correction
- true remaining gap

## Artifact update checklist

When a repair is justified, update the minimum complete set:

- local linter implementation
- local linter registration
- `tests/<RuleName>/rule.md`
- violating fixture(s)
- compliant control fixture(s)
- ignored-edge fixture(s), when needed to prove selector boundaries or filtered behavior
- `expect.json`
- focused snapshots and validation artifacts
- `validate-report.md`, when the checked-in report should change

## Validation loop

- rebuild the local linter when needed
- run the narrowest useful validation for the repaired rule first
- refresh the markdown report explicitly when that artifact is expected to change
- check that the local fixture set covers the full upstream semantic matrix before calling the repair complete
- prefer a clean "blocked/test-quality" conclusion over forcing native rule code when the repro itself is not trustworthy
