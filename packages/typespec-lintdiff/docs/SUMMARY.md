# Replace Swagger LintDiff with Native TypeSpec Validation

## Goal

- Replace Swagger-based LintDiff / Azure OpenAPI Validator checks with native TypeSpec validation for API rules in scope.
- Provide a single validation experience for TypeSpec authors and reviewers, with required TypeSpec warnings treated as errors in CI.
- Distinguish ARM, data-plane, common API rules, and SDK-specific rules so ownership and migration scope stay explicit.

## User Story

- Authors get violations on TypeSpec source instead of emitted Swagger, with the normal suppression model and codefix guidance where the native lint supports it.
- Reviewers get one validation story, with source links, RPC/guideline context, and an auditable record of which validator rules are natively covered, template-enforced, partial, excluded, or still gaps.
- ARM, data-plane, and common API rules are tracked separately so migration decisions stay understandable.

## Metrics

- Full rule classification is complete and source-backed.
- Highest-priority confirmed gaps have native replacements or explicit exclusion rationale.
- Confidence artifacts stay current: rule-by-rule tests, coverage/noise audits, the catalog, and the Markdown validation report.
- The migration scope is proven by mid-April, and the integration workflow is ready to demo by the first week of May.

## Detail

- Current proof point: the harness covers 223 test cases. It currently shows 33 direct native mappings, 5 template-only coverage cases, 1 partial mapping, 89 confirmed gaps with no TypeSpec diagnostics, and 32 possible gaps with unmapped TypeSpec diagnostics.
- The harness compiles TypeSpec, emits OpenAPI, runs Azure OpenAPI Validator, captures TypeSpec diagnostics, and groups results into confidence buckets in `validate-report.md`.
- Scope is API governance migration first. SDK-specific rules are tracked separately and may require different ownership or follow-on work.
- Delivery plan: finish classification and ambiguity removal this week, land the highest-priority native gap work next week, prove full migration scope by mid-April, and demonstrate the integration workflow by the first week of May.
