---
name: code-review
description: >
  Review diffs and pull requests in Azure/typespec-azure for compatibility,
  .chronus change descriptions, TypeSpec diagnostics and rulesets, SDK emitter
  and Spector contract regressions, and meaningful tests. Use for Copilot code
  review in this repository.
---

# TypeSpec Azure code review

Review the changed code against this repository's rules, not the upstream TypeSpec
compiler's breaking-change tiers. Trace the affected behavior for existing specs and
consumers before reporting a regression. Only post a finding when the problem is
concrete, attributable to the diff, and supported by a repository rule, test, or code
path you can cite.

## Scope and sources

Apply this skill across the repository: Azure TypeSpec libraries, rulesets, AutoRest,
client-generator core, the Go/Java/Python/TypeScript emitters, Azure HTTP specs, tests,
and tooling. Focus on the packages and paths changed in the pull request. Read the
relevant sources before judging:

- `docs/breaking-changes.md` for downstream rollout and hard breaks.
- `.chronus/config.yaml` and `.github/copilot-instructions.md` for change descriptions
  and package/release conventions.
- Any applicable `.github/instructions/*.instructions.md` and the touched package's
  README, tester, Spector config, tests, and existing output baselines. In particular,
  `.github/instructions/typespec-ts.instructions.md` governs the TypeScript emitter.
- The implementation of a referenced TypeSpec/compiler API or library helper when
  correctness depends on its actual behavior.

Do not review formatting, naming preferences, lint-covered issues, or unchanged code.
Ignore lockfile and generated implementation churn unless it exposes a concrete
inconsistency or regression. **Do inspect tracked generated contracts and baselines**
for unintended changes; notably, the TypeScript emitter tracks generated
`packages/typespec-ts/test/azure-modular-integration/generated/**/src/index.d.ts`
files even though most generated client implementation files are ignored.

## Compatibility and release impact

- Check whether a previously valid Azure spec, decorator/template invocation, ARM
  resource definition, SDK metadata consumer, or generated client now fails or behaves
  differently. Adding a new capability without changing existing behavior is not by
  itself breaking. Verify the affected public surface and consumer before claiming a
  break.
- Follow `docs/breaking-changes.md`: prefer introducing a replacement alongside the
  old behavior, migrating downstream specs and SDK consumers, then removing the old
  behavior in a later release. For a hard break that cannot be staged, check whether
  companion changes are ready for affected client emitters. Flag a missing bridge or
  migration only when the changed behavior demonstrably affects existing consumers.
- Review emitted wire/API contracts, not just TypeScript types: HTTP routes, parameters,
  status codes, model shapes, authentication, versions, paging and long-running
  operations may be consumed by specs or generated SDKs. Distinguish intended fixes
  from unintentional behavior changes; substantiate the latter with an existing spec
  or test.

## Change descriptions (`.chronus`)

- Valid `changeKind` values in `.chronus/config.yaml` are `internal`, `fix`,
  `dependencies`, `feature`, `deprecation`, and `breaking`. Check that the kind and
  `packages:` list reflect the actual affected packages and user-visible behavior;
  don't describe a breaking removal as a `fix` or bundle changes needing different
  kinds under one misleading entry.
- A published package with a user-visible code change needs an appropriate entry,
  including emitter or spec package changes where applicable. Do not require an entry
  solely for files excluded by `changedFiles`: `**/*.md`, `**/*.test.ts`, and
  `**/*.e2e.ts`. Do not generalize those exclusions to all files under `test/`, and
  check the config's ignored packages before reporting a missing entry.
- A breaking finding without a corresponding `breaking` entry is especially
  important. Cite the affected existing behavior as well as the changeset mismatch.

## Azure libraries, diagnostics, and rules

- For changes under `packages/typespec-azure-core`,
  `packages/typespec-azure-resource-manager`, `packages/typespec-autorest`, and
  `packages/typespec-client-generator-core`, follow decorator/resource/metadata
  consumers through the shipped entrypoint. Check realistic spec forms, including
  versions and missing/empty services where the code permits them; don't assume a
  lookup such as `listServices(program)[0]` always succeeds.
- Diagnostics should have a stable code, accurate message/severity, and a useful
  target on the offending TypeSpec node or type. A warning intended to be suppressible
  needs a real target rather than `NoTarget`; inspect the compiler's handling before
  claiming a diagnostic is suppressible. A severity change may allow execution paths
  that were previously blocked by errors: check the downstream path too.
- For new or changed linter rules, check their registration in the library's
  `src/linter.ts`, the applicable
  `packages/typespec-azure-rulesets/src/rulesets/{data-plane,resource-manager,client-sdk}.ts`
  configuration, rule documentation, and tests. The rulesets test
  `packages/typespec-azure-rulesets/test/validate-rules-defined.test.ts` requires Azure
  core and resource-manager rules to be explicitly enabled or disabled in their
  respective rulesets; do not assume the same requirement for the client-SDK ruleset.
  Confirm a rule doesn't diagnose the library's own declarations when those should be
  excluded, or miss inherited, spread, or template forms when those forms trigger the
  reported behavior.

## Emitters and Spector contracts

- For `packages/typespec-autorest`, compare OpenAPI definitions, `$ref` targets,
  operation IDs, and versioned output for existing specs. The tests under
  `packages/typespec-autorest/test/` assert the emitted shapes; check for broken
  references, name collisions, or dropped validations rather than treating any
  output difference as a defect.
- For `packages/typespec-{go,java,python,ts}` and client-generator core, trace changes
  from the TypeSpec spec through generated SDK surface and serialized HTTP behavior.
  Check that output changes to existing scenarios are intentional, particularly
  operation/model names, optionality, authentication, API versions, and requests and
  responses. A generated diff alone is not a defect; identify the observable
  regression and the input that triggers it.
- For changes in `packages/azure-http-specs/specs/**`, inspect the scenario's TypeSpec
  and its `mockapi.ts` where present. When an emitter opts into or updates a Spector case,
  compare its `spector.config*.yaml`, generated baselines, and handwritten client tests
  with the scenario assertions. Do not mistake a disabled opt-in or ignored generated
  implementation file for tested behavior.
- For TypeScript changes, use `.github/instructions/typespec-ts.instructions.md`: this
  emitter targets Azure-branded packages only, has distinct Vitest test projects, and
  checks tracked `src/index.d.ts` baselines for a clean regenerated tree. Don't request
  obsolete unbranded or CommonJS paths. Use each other emitter's own test layout and
  generation conventions instead of imposing the TypeScript workflow on it.

## Tests and comments

- Look for a regression test that exercises the actual decorator, linter, emitter, or
  generated client path. For TypeSpec library tests, prefer the package's existing
  `test/test-host.ts` or `test/tester.ts` setup and specific diagnostic assertions;
  for emitter tests, check the language's existing unit/integration/Spector pattern.
  Flag missing coverage only when you can identify a plausible failure it would catch.
- Tests should assert the new behavior, including relevant negative or boundary cases,
  rather than merely complete without error. Flag weakened assertions or new skips
  that hide relevant coverage, or tests that would still pass with the change reverted.
- Put one issue in each inline comment, anchored to a changed line. State the impact,
  cite the governing rule or the relevant `file:line`, and suggest a concrete fix in
  one or two sentences. Prioritize correctness, compatibility, release impact, and
  meaningful coverage; don't repeat another finding or post speculative suggestions.
