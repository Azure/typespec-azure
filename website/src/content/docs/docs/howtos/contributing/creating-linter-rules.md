---
title: Creating Linter Rules
---

This guide covers the full lifecycle of adding a TypeSpec linter rule for Azure
libraries in `typespec-azure`. It is written for both human developers and AI
coding agents that need a repeatable, end-to-end workflow.

## Overview

Linter rules enforce Azure API design guidelines on TypeSpec specifications.
Rules live in one of these packages:

| Package path                               | Scope            | npm name                                       |
| ------------------------------------------ | ---------------- | ---------------------------------------------- |
| `packages/typespec-azure-core`             | Data-plane rules | `@azure-tools/typespec-azure-core`             |
| `packages/typespec-azure-resource-manager` | ARM rules        | `@azure-tools/typespec-azure-resource-manager` |

A complete rule usually touches **7+ files across 3+ packages**:

1. Rule implementation in `packages/<pkg>/src/rules/<rule-name>.ts`
2. Linter registration in `packages/<pkg>/src/linter.ts`
3. Tests in `packages/<pkg>/test/rules/<rule-name>.test.ts`
4. Ruleset registration in `packages/typespec-azure-rulesets`
5. Rule documentation in `website/src/content/docs/docs/libraries/<pkg>/rules/`
6. Regenerated reference docs
7. A changeset in `.chronus/changes/`

:::note
For new rules, assume the work is not finished until the rule compiles, tests
pass, docs are regenerated, `pnpm validate:pr` passes, and the PR survives the
external integration run against `Azure/azure-rest-api-specs`.
:::

## Prerequisites

Before you start:

- Install **Node.js 22+**
- Enable **pnpm via corepack**
- Clone the repo **with submodules**
- Install dependencies with `pnpm install`

```bash
corepack enable
git clone --recurse-submodules https://github.com/Azure/typespec-azure.git
cd typespec-azure
pnpm install
```

## Step-by-Step Process

### Step 1: Plan the Rule

Decide the rule metadata before touching code:

| Decision            | What to choose                                             |
| ------------------- | ---------------------------------------------------------- |
| Package             | `typespec-azure-core` or `typespec-azure-resource-manager` |
| Rule name           | Kebab-case, for example `no-nullable-key`                  |
| Severity            | `warning` or `error`                                       |
| Target ruleset(s)   | Data-plane, resource-manager, or both                      |
| Enabled by default? | `true` or `false`                                          |

Also review existing rules in `packages/<pkg>/src/rules/` to match local
patterns for naming, visitors, diagnostics, and fixes.

:::note
AI agents should explicitly record the intended package, rule name, severity,
ruleset entry, and whether the rule is enabled by default before scaffolding.
That prevents follow-up churn across `linter.ts`, tests, and rulesets.
:::

### Step 2: Scaffold the Files

Use the repo scaffold command:

<!-- prettier-ignore -->
```bash
pnpm create:linter-rule <rule-name> --package <azure-core|azure-resource-manager> --severity <warning|error> --description "What the rule enforces"
```

It creates or updates the main rule artifacts:

- Rule source
- Rule test
- Rule docs page
- `linter.ts`

Concretely, expect changes like:

- `packages/<pkg>/src/rules/<rule-name>.ts`
- `packages/<pkg>/test/rules/<rule-name>.test.ts`
- `website/src/content/docs/docs/libraries/<pkg>/rules/<rule-name>.md`
- `packages/<pkg>/src/linter.ts`

### Step 3: Write Tests First (TDD)

Write or refine tests before implementing the rule logic.

For data-plane rules, start from the Azure Core test host:

```typescript
import { TesterWithService } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { myNewRule } from "../../src/rules/my-new-rule.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await TesterWithService.createInstance();
  tester = createLinterRuleTester(runner, myNewRule, "@azure-tools/typespec-azure-core");
});
```

For ARM rules, use the ARM tester:

```typescript
import { Tester } from "#test/tester.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach } from "vitest";
import { myArmRule } from "../../src/rules/my-arm-rule.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    myArmRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});
```

Core assertion patterns:

```typescript
await tester.expect(`model Pet { name: string; }`).toBeValid();

await tester.expect(`model BadPet { owner: string | null; }`).toEmitDiagnostics([
  {
    code: "@azure-tools/typespec-azure-core/my-new-rule",
    severity: "warning",
    message: "Expected diagnostic message",
  },
]);

await tester.expect(`enum Color { red }`).applyCodeFix("enum-to-extensible-union").toEqual(`
    union Color {
      string,
      red: "red",
    }
  `);
```

What to test:

- Valid code that must stay silent
- Invalid code that must emit the diagnostic
- Empty types and minimal declarations
- Nested generics or templates
- Decorated types
- Cross-namespace references
- Multiple violations in one file
- Near-misses that should **not** trigger

Verify the tests fail before implementation:

```bash
pnpm --filter "@azure-tools/typespec-<pkg>..." build
pnpm --filter "@azure-tools/typespec-<pkg>..." test
```

### Step 4: Implement the Rule

A typical rule is built with `createRule()` and one or more semantic visitor
hooks:

```typescript
import {
  ModelProperty,
  Namespace,
  createRule,
  defineCodeFix,
  getService,
  getSourceLocation,
  paramMessage,
} from "@typespec/compiler";

function createReadOnlyFix(property: ModelProperty) {
  return defineCodeFix({
    id: "add-readonly",
    label: "Add @visibility(Lifecycle.Read)",
    fix: (fixContext) => {
      if (property.node === undefined) return [];
      return fixContext.prependText(
        getSourceLocation(property.node),
        "@visibility(Lifecycle.Read)\n",
      );
    },
  });
}

export const myNewRule = createRule({
  name: "my-new-rule",
  description: "Require a specific Azure shape.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/my-new-rule",
  messages: {
    default: "This type violates the rule.",
    withName: paramMessage`Property '${"propertyName"}' must meet the Azure guideline.`,
  },
  create(context) {
    return {
      modelProperty(property: ModelProperty) {
        if (property.node === undefined) return;
        if (property.model?.namespace) {
          const service = getService(context.program, property.model.namespace as Namespace);
          if (service === undefined) return;
        }

        if (property.name === "badName") {
          context.reportDiagnostic({
            target: property,
            messageId: "withName",
            format: { propertyName: property.name },
            codefixes: [createReadOnlyFix(property)],
          });
        }
      },
    };
  },
});
```

Common visitor hooks:

- `model`
- `modelProperty`
- `operation`
- `interface`
- `enum`
- `enumMember`
- `union`
- `unionVariant`
- `namespace`
- `scalar`

Common implementation patterns:

- Use `context.reportDiagnostic({ target })` to report on the exact symbol
- Use `paramMessage` for interpolated messages
- Use `defineCodeFix` when a deterministic fix exists
- Skip template declarations or template signatures when the declaration itself
  is not the real target
- Check whether a type belongs to a service namespace before reporting
- Walk hierarchy when needed, such as `model.baseModel` or derived types

A minimal diagnostic looks like this:

```typescript
context.reportDiagnostic({
  target: property,
});
```

A parameterized diagnostic looks like this:

```typescript
context.reportDiagnostic({
  target: property,
  messageId: "withName",
  format: { propertyName: property.name },
});
```

A code-fix-enabled diagnostic looks like this:

```typescript
context.reportDiagnostic({
  target: property,
  codefixes: [createReadOnlyFix(property)],
});
```

:::caution
Keep the rule narrow. A broadly written rule may pass local unit tests and still
break dozens of real specs in external integration.
:::

### Step 5: Verify Tests Pass

Once the rule is implemented, rebuild and rerun tests:

```bash
pnpm --filter "@azure-tools/typespec-<pkg>..." build
pnpm --filter "@azure-tools/typespec-<pkg>..." test
```

Do not move on until the new tests pass and existing tests for that package stay
green.

### Step 6: Register in Rulesets

Add the rule to the right ruleset file:

- Data-plane: `packages/typespec-azure-rulesets/src/rulesets/data-plane.ts`
- ARM: `packages/typespec-azure-rulesets/src/rulesets/resource-manager.ts`

Entry format:

```typescript
"@azure-tools/typespec-<pkg>/<rule-name>": true,
```

Use `false` instead of `true` when the rule should ship but stay disabled by
default.

The test `validate-rules-defined.test.ts` catches missing ruleset entries.

Verify ruleset registration:

```bash
pnpm --filter "@azure-tools/typespec-azure-rulesets..." build
pnpm --filter "@azure-tools/typespec-azure-rulesets..." test
```

### Step 7: Write Documentation

Each rule needs its own rule page:

- `website/src/content/docs/docs/libraries/<pkg>/rules/<rule-name>.md`

That page should include:

- Frontmatter with a `title`
- A `Full name` code block
- A plain-language description
- `#### ❌ Incorrect` examples
- `#### ✅ Correct` examples

Example rule doc shape:

````markdown
---
title: "my-new-rule"
---

```text title="Full name"
@azure-tools/typespec-azure-core/my-new-rule
```

Brief description of the rule.

#### ❌ Incorrect

```tsp
model BadThing {
  badName: string;
}
```

#### ✅ Correct

```tsp
model GoodThing {
  goodName: string;
}
```
````

After editing the rule docs, regenerate package docs:

```bash
pnpm --filter "@azure-tools/typespec-<pkg>..." build
pnpm --filter "@azure-tools/typespec-<pkg>" regen-docs
```

### Step 8: Create a Changeset

Create a changelog entry:

```bash
pnpm change add
```

Choose:

- `feature` for a new rule
- `fix` for a bug fix to an existing rule
- Package: `@azure-tools/typespec-<pkg>`

### Step 9: Local Validation

Run the repo validation flow:

```bash
pnpm validate:pr
```

This checks:

- Branch sync
- Build
- Tests
- Lint
- Format
- `cspell` spelling
- `regen-docs` freshness
- Changeset presence
- Diff cleanliness

Use `--fix` when you want auto-fixes for formatting and lint:

```bash
pnpm validate:pr --fix
```

### Step 10: External Integration Check

This step is critical for linter rules. New diagnostics must not break existing
Azure service specs in `Azure/azure-rest-api-specs`.

After opening the PR:

1. Apply the `int:azure-specs` label
2. Wait for the External Integration workflow to run
3. Review any failures before requesting review

The workflow:

1. Builds and packs all `typespec-azure` packages from your PR
2. Checks out `azure-rest-api-specs` main
3. Patches the packages into that repo
4. Runs `tsp-integration azure-specs --stage validate`
5. Checks for unexpected changes

If the check fails:

- Narrow the rule logic
- Or set the rule to `false` in the ruleset and plan a phased rollout

For local experimentation, see
[Testing a change in azure-rest-api-specs](https://github.com/Azure/typespec-azure?tab=contributing-ov-file#testing-a-change-in-repo-azure-rest-api-specs).

## Reference

### Naming Conventions

| Item             | Convention                                                                      | Example                                                                                  |
| ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Rule name        | kebab-case                                                                      | `no-nullable-key`                                                                        |
| Export variable  | camelCase + `Rule`                                                              | `noNullableKeyRule`                                                                      |
| Import extension | Always `.js`                                                                    | `from "./rules/no-nullable-key.js"`                                                      |
| Diagnostic code  | `@azure-tools/typespec-<pkg>/<rule-name>`                                       | `@azure-tools/typespec-azure-core/no-nullable-key`                                       |
| Rule URL         | `https://azure.github.io/typespec-azure/docs/libraries/<pkg>/rules/<rule-name>` | `https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-nullable-key` |

### File Locations

```text
packages/
├── typespec-azure-core/
│   ├── src/
│   │   ├── linter.ts
│   │   └── rules/
│   │       └── <rule-name>.ts
│   └── test/
│       ├── test-host.ts
│       └── rules/
│           └── <rule-name>.test.ts
├── typespec-azure-resource-manager/
│   ├── src/
│   │   ├── linter.ts
│   │   └── rules/
│   │       └── <rule-name>.ts
│   └── test/
│       ├── tester.ts
│       └── rules/
│           └── <rule-name>.test.ts
├── typespec-azure-rulesets/
│   ├── src/rulesets/data-plane.ts
│   └── src/rulesets/resource-manager.ts
website/
└── src/content/docs/docs/libraries/
    ├── azure-core/rules/<rule-name>.md
    └── azure-resource-manager/rules/<rule-name>.md
```

### Test Hosts

| Package                           | Import                                                   | Notes                         |
| --------------------------------- | -------------------------------------------------------- | ----------------------------- |
| `typespec-azure-core`             | `import { TesterWithService } from "#test/test-host.js"` | Wraps in `@service namespace` |
| `typespec-azure-resource-manager` | `import { Tester } from "#test/tester.js"`               | ARM context                   |

### Common Compiler APIs

- `createRule`
- `paramMessage`
- `defineCodeFix`
- `getService`
- `Model`
- `ModelProperty`
- `Operation`
- `Namespace`
- `Type`

### Useful Patterns from Existing Rules

- Check decorators
- Walk model hierarchy
- Check whether the symbol is in a service namespace
- Inspect property type details
- Skip template declarations or uninstantiated template signatures

## Troubleshooting

| Problem                        | Cause                     | Fix                                                               |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------- |
| `validate-rules-defined` fails | Rule not in ruleset       | Add to `data-plane.ts` or `resource-manager.ts`                   |
| Tests can't find rule          | Import path wrong         | Check the `.js` extension and `linter.ts`                         |
| `pnpm format` fails            | Prettier plugin not built | Run `pnpm --filter "@typespec/prettier-plugin-typespec..." build` |
| External Integration fails     | Rule flags existing specs | Narrow the rule or disable it by default                          |
| `regen-docs` shows changes     | Forgot `regen-docs`       | Run it and commit the output                                      |
| Changeset missing              | `pnpm change add` not run | Run it and select the package                                     |

## Checklist

- [ ] Rule implementation complete, handles edge cases
- [ ] Tests cover valid, invalid, edge cases (≥95% branch coverage)
- [ ] Rule registered in `linter.ts`
- [ ] Rule listed in appropriate ruleset(s)
- [ ] Documentation has realistic examples
- [ ] Reference docs regenerated
- [ ] Changeset created
- [ ] `pnpm validate:pr` passes
- [ ] `int:azure-specs` External Integration check passes
- [ ] PR diff contains only expected files
