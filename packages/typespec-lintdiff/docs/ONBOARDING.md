# Rule Onboarding Procedure

## How to add a new rule to the test suite

### 1. Understand the rule

- Read the rule's documentation in `azure-openapi-validator/docs/{rule-name}.md`. This is the
  **source of truth** for what the rule is supposed to do — not the error message, not the code.
- Read the implementation in
  `azure-openapi-validator/packages/rulesets/src/spectral/functions/{rule-name}.ts` to understand
  the exact detection logic and edge cases.
- Check the existing tests in
  `azure-openapi-validator/packages/rulesets/src/spectral/test/{rule-name}.test.ts` for examples of
  violating and non-violating swagger.
- Note the rule's registration in `az-arm.ts` — look for the Spectral rule ID, severity,
  `disableForTypeSpec*` flags, and the `given` JSONPath selector.

### 2. Identify the TypeSpec linter equivalent (if any)

- Check the ARM linter rules:
  ```
  node -e "import('@azure-tools/typespec-azure-resource-manager').then(m => {
    for (const r of m.\$linter.rules) console.log(r.name);
  })"
  ```
- Also check azure-core rules if relevant.
- If the `az-arm.ts` entry has `disableForTypeSpec: true` or `disableForTypeSpecDataPlane: true`,
  the reason text usually names the corresponding TSP rule.
- Before treating the rule as a true gap, inspect the TypeSpec repro for `#suppress` directives and
  prerequisite diagnostics. If the violating shape only exists by suppressing an existing TypeSpec
  lint (for example `@azure-tools/typespec-azure-core/no-openapi`), classify the case as blocked or
  ambiguous rather than a clean gap.

### 3. Create the test directory

```
mkdir -p tests/{RuleName}/{test-case-id}
```

### 4. Write rule.md

Create `tests/{RuleName}/rule.md` with:
- RPC code, severity, applicability
- Description of the rule (from the docs)
- Detection logic summary
- Table of test cases with IDs, violation type, and description

### 5. Write test cases

For each distinct violation path in the rule, create `tests/{RuleName}/{test-case-id}/main.tsp`.

**Approach for writing violating TypeSpec:**

- Start from the ARM resource boilerplate (see existing test cases for the template: imports,
  namespace, versions, TrackedResource model, `@armResourceOperations` interface).
- For operations that match the standard ARM templates (e.g. `ArmResourceRead`,
  `ArmResourceDeleteWithoutOkAsync`), the generated swagger will be _compliant_. To produce
  violations, you need to write custom operations using raw `@get`/`@delete`/`@put`/`@post`
  decorators with `@armResourceRead`/`@armResourceDelete`/etc. and explicit response types.
- Use `@extension("x-ms-long-running-operation", true)` (from `TypeSpec.OpenAPI`) to control LRO
  markers.
- Use custom response models with `@statusCode` to control which HTTP status codes appear.

**Verify each test case:**

```bash
npx tsp compile tests/{RuleName}/{test-case-id}/
```

Then inspect the generated swagger to confirm it has the shape that would trigger the rule.

Also inspect `main.tsp` itself for `#suppress` directives. A repro that only works by suppressing an
unrelated TypeSpec diagnostic is useful evidence, but it should not be treated as proof that a new
native lint is the right migration target.

### 6. Update scripts/validate.ts

Add entries to the two maps:

```typescript
const RULE_ID_MAP: Record<string, string> = {
  // ...
  RuleName: "SpectralRuleId",  // from az-arm.ts
};

const TSP_DIAGNOSTIC_MAP: Record<string, string[]> = {
  // ...
  RuleName: [
    "@azure-tools/typespec-azure-resource-manager/tsp-rule-name",
  ],
  // or empty array if no TSP equivalent:
  RuleName: [],
};
```

### 7. Generate snapshots and validate

```bash
npm run validate -- --update-snapshots RuleName
npm run validate -- RuleName
```

### 8. Commit

Stage the new `rule.md`, all `main.tsp` and `output.json` files, and the updated `validate.ts`.
