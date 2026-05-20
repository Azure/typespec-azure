---
name: create-linter-rule
description: >
  Create a new TypeSpec linter rule with TDD approach, including implementation,
  tests, documentation, ruleset registration, and changeset. Use this skill when
  asked to create, add, or implement a new linter rule for TypeSpec Azure libraries.
allowed-tools: shell
---

# Create a TypeSpec Linter Rule

Follow these steps in order to create a complete, high-quality linter rule.

## Step 1: IDENTIFY

Determine the rule metadata before writing any code:

- **Package**: `typespec-azure-core` (data-plane rules) or `typespec-azure-resource-manager` (ARM rules)
- **Rule name**: kebab-case (e.g., `no-nullable-key`, `require-pagination`)
- **Severity**: `warning` (style/best practice) or `error` (correctness/breaking)
- **Target ruleset(s)**: `data-plane`, `resource-manager`, or both
- **Description**: One-line explanation of what the rule enforces

## Step 2: SCAFFOLD

Generate all required files using the repo's scaffolding tool:

```bash
pnpm create:linter-rule < rule-name > --package < azure-core | azure-resource-manager > --severity < warning | error > --description "<description>"
```

This creates:

- `packages/<pkg>/src/rules/<rule-name>.ts` — rule skeleton
- `packages/<pkg>/test/rules/<rule-name>.test.ts` — test skeleton
- `website/src/content/docs/docs/libraries/<pkg>/rules/<rule-name>.md` — docs skeleton
- Updates `packages/<pkg>/src/linter.ts` — registers the rule

## Step 3: WRITE FAILING TESTS FIRST (TDD)

Edit `packages/<pkg>/test/rules/<rule-name>.test.ts`:

1. Write tests for **valid code** that should produce no diagnostics (`.toBeValid()`)
2. Write tests for **invalid code** that should produce specific diagnostics (`.toEmitDiagnostics()`)
3. Write tests for **edge cases**:
   - Empty/minimal inputs
   - Nested types and generics
   - Decorated types
   - Cross-namespace references
   - Multiple violations in one file
   - Types that look similar but shouldn't trigger the rule

Test API reference:

```typescript
// No diagnostics expected
await tester.expect(`model Foo {}`).toBeValid();

// Specific diagnostic expected
await tester.expect(`model foo {}`).toEmitDiagnostics([
  {
    code: "@azure-tools/typespec-<pkg>/<rule-name>",
    severity: "<severity>",
    message: "Expected message text",
  },
]);

// Test code fix (if rule provides one)
await tester
  .expect(`enum Color { red }`)
  .applyCodeFix("fix-id")
  .toEqual(`union Color { string, red: "red" }`);
```

Verify tests fail before implementing:

```bash
pnpm --filter "@azure-tools/typespec-<pkg>..." build
pnpm --filter "@azure-tools/typespec-<pkg>..." test
```

## Step 4: IMPLEMENT THE RULE

Edit `packages/<pkg>/src/rules/<rule-name>.ts`:

- Implement visitor logic in the `create(context)` function
- Return a `SemanticNodeListener` with the appropriate hooks:
  - `model` — for model-level checks
  - `modelProperty` — for property-level checks
  - `operation` — for operation-level checks
  - `enum` — for enum checks
  - `namespace` — for namespace-level checks
  - `interface` — for interface checks
  - `union` / `unionVariant` — for union checks
- Use `context.reportDiagnostic({ target })` to report violations
- Use `paramMessage` from `@typespec/compiler` for interpolated messages
- Add `codefixes` array to `reportDiagnostic()` if a fix is possible

## Step 5: VERIFY TESTS PASS

```bash
pnpm --filter "@azure-tools/typespec-<pkg>..." build
pnpm --filter "@azure-tools/typespec-<pkg>..." test
```

All tests should pass. If not, fix the implementation until they do.

## Step 6: REGISTER IN RULESETS

Add the rule to the appropriate ruleset(s):

- **Data-plane rules**: Edit `packages/typespec-azure-rulesets/src/rulesets/data-plane.ts`
- **ARM rules**: Edit `packages/typespec-azure-rulesets/src/rulesets/resource-manager.ts`

Add an entry: `"@azure-tools/typespec-<pkg>/<rule-name>": true,`

Every rule MUST be explicitly listed (enabled or disabled). The `validate-rules-defined.test.ts` test will fail otherwise.

Verify:

```bash
pnpm --filter "@azure-tools/typespec-azure-rulesets..." build
pnpm --filter "@azure-tools/typespec-azure-rulesets..." test
```

## Step 7: WRITE DOCUMENTATION AND REGENERATE DOCS

Edit `website/src/content/docs/docs/libraries/<pkg>/rules/<rule-name>.md`:

- Replace all placeholder text
- Write a clear description of what the rule checks and why
- Provide realistic ❌ Incorrect and ✅ Correct examples using actual TypeSpec patterns
- Ensure the `Full name` code block shows the correct fully-qualified rule name

Then regenerate the library's reference docs (updates the rule listing):

```bash
pnpm --filter "@azure-tools/typespec-<pkg>..." build
pnpm --filter "@azure-tools/typespec-<pkg>" regen-docs
```

## Step 8: CREATE CHANGESET

```bash
pnpm change add
```

When prompted:

- Select change kind: `feature` (new rule) or `fix` (bugfix to existing rule)
- Select affected package: `@azure-tools/typespec-<pkg>`
- Write a concise description: "Add `<rule-name>` linter rule that <what it does>"

## Step 9: FINAL VALIDATION

Run the general pre-PR validation to ensure everything is ready:

```bash
pnpm validate:pr
```

This checks: branch is up to date, build passes, tests pass, lint passes, format is clean, spelling is clean, regen-docs is clean, changeset exists, and diff only contains expected files.

If any check fails, fix the issue and re-run. Use `pnpm validate:pr --fix` to auto-fix formatting and lint issues.

## Important Notes

- **Import extensions**: Always use `.js` extensions in imports (e.g., `from "./rules/my-rule.js"`)
- **Rule URL**: Must match `https://azure.github.io/typespec-azure/docs/libraries/<pkg>/rules/<rule-name>`
- **Test coverage**: Aim for ≥ 95% branch coverage of the rule file
- **Existing patterns**: Look at similar existing rules in `packages/<pkg>/src/rules/` for reference
- **ARM rules can import from azure-core**: `import { ... } from "@azure-tools/typespec-azure-core"`
