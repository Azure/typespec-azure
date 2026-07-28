# Test @azure-tools/typespec-java

This folder holds the end-to-end (Spector + Maven/JUnit) tests for
`@azure-tools/typespec-java` (the branded Java emitter built in the parent
`@azure-tools/typespec-java` package (`..`)). It regenerates and tests the emitter
against the [http-specs] and [azure-http-specs] Spector suites and a set of local
TypeSpec sources under [`tsp/`](./tsp).

It is **part of the `@azure-tools/typespec-java` workspace package** — it has no
`package.json` of its own. Its npm scripts (`regenerate`, `test:java:e2e`,
`spector-*`) live in the parent `../package.json`, and it consumes the emitter
directly from the workspace build (`../dist` + `../generator/.../emitter.jar`),
resolved via [`tspconfig.yaml`](./tspconfig.yaml)'s local emitter path — no packed
`.tgz`.

## Prerequisite

Install [Node.js](https://nodejs.org/en/download/) 22 or above. (Verify by running `node --version`)

Install [Java](https://docs.microsoft.com/java/openjdk/download) 11 or above. (Verify by running `java --version`)

Install [Maven](https://maven.apache.org/download.cgi). (Verify by running `mvn --version`)

Run `pnpm install` at the repo root once to install workspace dependencies (spector,
http-specs, etc.).

## Build emitter and generate code

Run from the parent (`packages/typespec-java`) folder:

```pwsh
pnpm run regenerate
```

`regenerate` runs [`Generate.ps1`](../Generate.ps1), which builds the emitter
(`pnpm build`), then regenerates the SDK from the local `tsp/` sources and the
[http-specs]/[azure-http-specs] specs into the (gitignored) `src/main/java` folder.
This takes a while.

## Run the Spector tests

From `packages/typespec-java`:

```pwsh
pnpm run test:java:e2e
```

This runs [`Spector-Tests.ps1`](../Spector-Tests.ps1): it starts the `tsp-spector`
mock server, runs the JUnit tests (`mvn clean test`) against the generated SDK, then
stops the server. It also writes `tsp-spector-coverage-java.json`.

To start/stop the mock server manually (for example to run individual tests from your
IDE), from `packages/typespec-java`:

```shell
pnpm run spector-start   # or: pnpm run spector-serve  (foreground)
pnpm run spector-stop
```

## Sync hand-written tests and specs from core

The hand-written JUnit tests under `src/test/java` and the local specs under `tsp/`
are synced from the unbranded test project in the `core/` submodule
(`core/packages/http-client-java/http-client-generator-test`). Refresh them from
`packages/typespec-java` with:

```pwsh
pnpm run sync-tests
```

The Azure-specific customization classes under `customization/` are hand-maintained
here and are **not** synced from core.

## Generate code for a single TypeSpec source

```shell
npx tsp compile <target.tsp>
```

Useful for a quick check that a change to the emitter behaves as expected. Generated
code is written to `tsp-output/` for inspection.

## Troubleshooting

### New version of `@typespec/compiler` etc.

Peer/dependency versions are managed by the workspace `catalog:` / `workspace:^`
protocols in the parent `package.json`. Run `pnpm install` at the repo root to pick up
new versions.

[http-specs]: https://github.com/microsoft/typespec/tree/main/packages/http-specs
[azure-http-specs]: https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs

