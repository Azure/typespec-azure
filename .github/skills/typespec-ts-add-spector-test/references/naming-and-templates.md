# Naming and Templates

## Test File Naming

Use a descriptive kebab-case filename ending in `.test.ts`.

Historical names are not generated mechanically from spec paths, so search nearby tests before choosing a name.

Current examples include:

| Spec or output path                  | Test file                                    |
| ------------------------------------ | -------------------------------------------- |
| `encode/numeric`                     | `encode-numeric.test.ts`                     |
| `authentication/api-key`             | `auth-api-key.test.ts`                       |
| `azure/core/model`                   | `azure-core-model.test.ts`                   |
| `azure/resource-manager/resources`   | `azure-arm-resources.test.ts`                |
| `azure/client-generator-core/access` | `azure-client-generator-core-access.test.ts` |

One test file may cover several related outputs, as `azure-client-generator-core-client-location.test.ts` does.

## tspconfig.yaml

Use this minimal configuration unless the case requires additional supported emitter options:

```yaml
emit:
  - "@azure-tools/typespec-ts"
options:
  "@azure-tools/typespec-ts":
    emitter-output-dir: "{project-root}"
    package-details:
      name: "@msinternal/<descriptive-kebab-name>"
```

Do not copy removed `flavor`, `azure-sdk-for-js`, `module-kind`, or `source-from` options from older fixtures.

Do not set `add-credentials: false` for authentication scenarios because it suppresses generated credentials.

Use a unique valid package name derived from the output path.

Copy additional options from a current, closely related fixture only when the scenario requires them.

## .gitignore

Use:

```gitignore
/**
!/src
/src/**
!/src/index.d.ts
!/.gitignore
!/tspconfig.yaml
```

This tracks only the generated declaration rollup and package configuration.

## Test Boilerplate

Import generated TypeScript through a `.js` module specifier:

```typescript
import { assert, beforeEach, describe, it } from "vitest";

import { NumericClient } from "./generated/encode/numeric/src/index.js";

describe("Numeric Client", () => {
  let client: NumericClient;

  beforeEach(() => {
    client = new NumericClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("handles a safe integer encoded as a string", async () => {
    const result = await client.property.safeintAsString({
      value: "10000000000",
    });
    assert.strictEqual(result.value, "10000000000");
  });
});
```

Treat this as a shape, not a copy-paste contract.

Read the generated client because credentials, endpoint parameters, API versions, and client initialization parameters can change the constructor.

## Common Patterns

- Use `http://localhost:3002` and `allowInsecureConnection: true`.
- Disable retries with `retryOptions.maxRetries: 0` when the generated options support it.
- Use `assert.strictEqual`, `assert.deepEqual`, or other Vitest assertions for meaningful response values.
- For paging, iterate the generated async iterable and assert collected items.
- For long-running operations, await the generated operation according to its actual return type.
- For expected errors, narrow the caught value safely before asserting status or message details.
- Import generated model or option types when they clarify request construction.
