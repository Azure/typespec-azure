# TypeSpec LintDiff Migration

The Azure REST API Specs repo still has several validation pipelines based on Swagger. This document contains our
strategy for porting the functionality provided by azure-openapi-validator (a.k.a. Swagger LintDiff) to TypeSpec.

## Must-haves

1. Substitute functionality in Swagger LintDiff/azure-openapi-validator with native TypeSpec validations providing the
   same coverage.
2. Replace engineering system functionality for Swagger LintDiff with improved review/approval processes for TypeSpec.
3. Provide ease of extension and use for ARM Platform team and Azure service teams at large; ARM team continues to own ARM rules, and the system is much easier to contribute to and enhance with better functionality.
4. Produce confidence artifacts that make migration decisions auditable: rule-by-rule tests, coverage/noise audits,
   source-backed mapping notes, and a Markdown validation report that management and partner teams can review.

## Key Stakeholders

- ARM team, for spec/rule authoring (point of contact Suhas Rao).
- EngSys, for maintaining repo process (point of contact Mike Harder, Daniel Jurek).
- Azure API Stewardship Board, for managing approval for rule exceptions (point of contact Johan Stenberg).
- TypeSpec Team, as developers of fundamental infrastructure
- Shanghai team, as an implementation and tooling partner.
- SDK Teams, as there are SDK rules in lintdiff (point of contact Laurent Mazuel)

## Strategy

**Timeline**: Full coverage classification by the end of this week. Native coverage for the highest-priority gaps by the
end of next week. Full migration scope proven by mid-April. A demonstrated integration workflow by the first week of
May, so the workflow Azure teams will use is proven and ready to demo for the organization.

### Delivery milestones

- [x] **Build the measurement baseline**  
       Status: Complete.  
       Outcome: We have a repeatable harness that compares TypeSpec diagnostics to Azure OpenAPI Validator results rule-by-rule,
      plus auditable metadata for direct coverage, template-enforced coverage, partial coverage, and gaps.

- [ ] **Finish coverage classification and remove ambiguity**  
        Estimate: By the end of this week.  
        Outcome: The remaining rules are cleanly categorized as:
  - verified native coverage,
  - template-enforced coverage,
  - partial coverage,
  - or true missing native validation.
    Focus: Resolve the remaining template-signal questions and review the small set of GAP cases that still emit potentially
     relevant TypeSpec diagnostics.

- [ ] **Implement native coverage for the highest-priority gaps**  
        Estimate: By the end of next week.  
        Outcome: The highest-value ARM rule families have verified native replacements or a documented template-enforced story,
      materially reducing the current Swagger-based dependency.
      Focus: Prioritize ARM-relevant gaps that are reproducible in this repo and can be addressed with semantically aligned
      native TypeSpec rules, while continuing to refine tests so each case proves the intended equivalence.

- [ ] **Prove full migration scope**  
        Estimate: By mid-April.  
        Outcome: Every validator rule in scope is accounted for with one of the following:
  - verified native equivalence,
  - verified template-enforced coverage,
  - bounded partial coverage with the remaining difference explained,
  - or a specific documented reason the rule is intentionally excluded from migration.
     Focus: Drive the rule inventory to closure, eliminate ambiguous classifications, and ensure the repo produces an auditable
     proof of equivalence or exclusion for the full rule set.

- [ ] **Demonstrate the integration workflow**  
        Estimate: By the first week of May.  
        Outcome: The end-to-end workflow Azure teams will use is proven, packaged, and ready for organizational demo, even if
       full `azure-rest-api-specs` integration continues as follow-on work.
       Focus: Show how the native rules, validation harness, coverage reporting, and review flow fit together in the form teams
       will actually consume.

### Stakeholder checkpoints

- **End of this week**: ARM team and TypeSpec team review the finalized classification model, source-backed mapping notes,
  and the confidence buckets in the Markdown validation report.
- **End of next week**: EngSys review begins on the native-validation workflow, suppression model, and the artifacts needed
  for onboarding and process replacement.
- **Mid-April**: API Stewardship Board, SDK stakeholders, and partner teams review any remaining exclusions, partial
  mappings, and cross-team ownership boundaries.
- **First week of May**: Organization-facing demo shows the workflow Azure teams would use, including validation output,
  suppression review, coverage reporting, and the path to repo integration.

### How progress becomes confidence

- Each milestone should leave behind a durable artifact, not just a claim:
  - the harness and snapshots prove reproducibility,
  - `audit:coverage` proves the metadata story,
  - `audit:noise` isolates candidate mappings from incidental diagnostics,
  - `validate-report.md` groups the corpus into confidence buckets,
  - and source-backed notes in `rule.md` show why specific mappings are trusted or rejected.
- Agent-assisted workflows are useful accelerants for reviewing rule source, generating candidate tests, and auditing the
  corpus, but the durable outputs above are the source of truth that partners and management can inspect.
- Success should be visible as:
  - more rules moving into direct or clearly-bounded coverage buckets,
  - fewer ambiguous gap cases,
  - fewer test-quality issues,
  - and a clearer onboarding story for ARM, EngSys, and service teams.

## Current implementation

Install dependencies

```
$ npm i
```

Run the main validation harness to check current status.

```
npm run validate
```

This compiles all test cases, emits OpenAPI, runs the Azure OpenAPI Validator against the generated swagger, and compares
the resulting swagger diagnostics to the verified TypeSpec diagnostics configured for each rule.

To generate the full confidence report by result type, run:

```
npm run validate -- --report-md
```

The current top-line breakdown from `validate-report.md` is:

- 223 total test cases
- 33 covered by direct native TypeSpec lints
- 5 covered only by template-related diagnostics
- 1 intentionally partial mapping
- 89 confirmed gaps with no TypeSpec diagnostics
- 32 possible gaps with unmapped TypeSpec diagnostics
- 10 expected-violation tests where the validator stayed silent
- 52 compliance tests with unmapped TypeSpec diagnostics
- 1 compliance test with an unexpected validator violation

Additional audit commands are available:

```
npm run audit:coverage
npm run audit:noise
```

- `audit:coverage` summarizes metadata-level coverage alignment. The current state is:
  - 210 rules audited,
  - 0 official-but-unverified mappings,
  - 3 template-enforced rules without a verified template signal,
  - 8 template-enforced rules without a verified non-template backstop,
  - 18 locally verified mappings not listed on the ARM RPC coverage page.
- `audit:noise` is used to review GAP cases that still emit TypeSpec diagnostics so we can distinguish true missing native
  rules from potentially missing mappings or incidental warnings.
- `validate-report.md` is the main review artifact for confidence: it groups tests into buckets such as direct coverage,
  template-only coverage, confirmed gaps, possible gaps, and test-quality problems.

Each rule lives under `tests/<RuleName>/` and typically includes:

- `rule.md`: metadata, rule description, and current coverage mapping.
- `<case-id>/main.tsp`: the TypeSpec source for a single test case.
- emitted swagger snapshots and expectation files used by the harness.

The statistics are as follows:

- Violation tests: tests intended to provoke an Azure OpenAPI Validator warning in the emitted swagger.
  - covered: the test emits a verified TypeSpec diagnostic that we consider equivalent to the swagger lint.
  - partial: the test emits a related TypeSpec diagnostic, but the known coverage is narrower than the validator rule.
  - gaps: the swagger output violates the validator rule, but the TypeSpec side does not produce a verified equivalent
    diagnostic.
    - no TypeSpec diagnostics: no TypeSpec diagnostics were emitted for the case.
    - unexpected TypeSpec diagnostics: TypeSpec emitted diagnostics, but none are currently mapped as equivalent.
  - no swagger violation: the test was meant to trigger the validator rule, but the emitted swagger does not currently do so.
- Compliance tests: tests intended to be compliant or structurally impossible to violate from TypeSpec.
  - unexpected violations: tests in the compliant bucket that still trigger the validator rule and need investigation.

## Architectural Notes

- The "diff" aspect of LintDiff is not important. We want to move to a model where the tool runs on what is in the committed branch only, without diffing it against previous iterations.
- TypeSpec lints should be able to provide all of the requisite functionality by validating TypeSpec shape/metadata and relying on the emitter to produce correct output from there, or by validating the HTTP payload shapes in the `@typespec/http` layer.

### Out of scope

- Non-http services.
- Breaking change validation.
- Other tools such as avocado and model/semantic validator.

[rpc_guidelines_coverage]: https://azure.github.io/typespec-azure/docs/howtos/arm/rpc-guidelines-coverage/
