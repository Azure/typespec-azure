# How to Contribute

## Prerequisites

Follow the repository-level **[Prerequisites](../../CONTRIBUTING.md#prerequisites)** to install
the required tooling (Node.js and `pnpm`). The command scripts under `test/commands/*` run on
`node` directly (no `tsx`), which requires **Node >= 22.18**.

## Clone, build & test

1. Clone the `typespec-azure` monorepo (this emitter lives in `packages/typespec-ts`). The repo
   uses a git submodule for `core/`, so initialize submodules when cloning:

   ```bash
   git clone --recurse-submodules https://github.com/Azure/typespec-azure.git
   ```

   If you already cloned without `--recurse-submodules`, run `git submodule update --init`.

2. Install dependencies and build from the repo root:

   ```bash
   pnpm install
   pnpm build
   ```

   To build only this package and its dependencies:

   ```bash
   pnpm -r --filter "@azure-tools/typespec-ts..." build
   ```

3. Run the commands below from `packages/typespec-ts`.

## Test suites

The package is tested through three vitest projects (configured in `vitest.config.ts`):

| Project                     | Location                            | Covers                           | Command                                  |
| --------------------------- | ----------------------------------- | -------------------------------- | ---------------------------------------- |
| `test-next`                 | `test-next/**`                      | Modern unit tests                | `pnpm test-next`                         |
| `unit-modular`              | `test/modular-unit/**`              | Modular unit tests               | `pnpm unit-test`                         |
| `integration-azure-modular` | `test/azure-modular-integration/**` | Modular spector end-to-end tests | `pnpm integration-test-ci:azure-modular` |

`pnpm lint` runs ESLint with `--max-warnings=0`.

The integration suite generates real clients from specs and runs them against a local spector
test server; `pnpm integration-test-ci:azure-modular` starts the server, generates, and runs the
assertions for you. To (re)generate the tracked baselines without running the tests:

```bash
pnpm copy:typespec     # assemble ./temp/specs from the http-specs packages
pnpm generate-tsp-only # regenerate all Azure modular baselines (client + declarations)
pnpm check:tree        # fails if regeneration left the git tree dirty
```

> Only `src/index.d.ts` is tracked per generated package, so `check:tree` is what guards the
> generated API surface in CI. See `.github/instructions/typespec-ts.instructions.md` for the
> full pipeline details.

## How to add an integration (spector) test case

1. Pick a spec from `@typespec/http-specs` or `@azure-tools/azure-http-specs` as your input
   (for example `authentication/api-key`).

2. Add an entry to the `azureModularTsps` array in
   [`test/commands/spector-list.js`](./test/commands/spector-list.js):

   ```js
   {
     outputPath: "authentication/apiKey",
     inputPath: "authentication/api-key",
   },
   ```

3. Create a `tspconfig.yaml` under
   `test/azure-modular-integration/generated/authentication/apiKey/`:

   ```yaml
   emit:
     - "@azure-tools/typespec-ts"
   options:
     "@azure-tools/typespec-ts":
       emitter-output-dir: "{project-root}"
       generate-metadata: true
       generate-test: false
       is-typespec-test: true
       hierarchy-client: false
       package-details:
         name: "@msinternal/auth-apikey"
         description: "Auth api key Test Service"
   ```

4. Generate the client for your case. During development you can temporarily trim
   `azureModularTsps` to just your entry for a faster loop, and emit only the importable sources:

   ```bash
   pnpm copy:typespec
   pnpm generate-tsp-only:azure-modular:client
   ```

   Once your change is complete, regenerate the whole suite and verify there are no unexpected
   diffs:

   ```bash
   pnpm generate-tsp-only
   pnpm check:tree
   ```

5. Add a `*.test.ts` file under `test/azure-modular-integration/` with your assertions. There are
   many existing examples in that folder (e.g. `auth-api-key.test.ts`).

## How to debug

The repo ships a **Debug Current Test File** VS Code launch profile (`.vscode/launch.json`) that
runs the currently open file through vitest with the debugger attached. Open any `*.test.ts`
file (unit or integration), select that profile, and press play — breakpoints work in both the
test and the emitter `src/`.
