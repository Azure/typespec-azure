# Test @azure-tools/typespec-java

This project regenerates and tests `@azure-tools/typespec-java` (the branded Java emitter built in
the sibling [`emitter/`](../emitter) folder) against the [http-specs] and [azure-http-specs] Spector
suites and a set of local TypeSpec sources under [`tsp/`](./tsp).

It is a standalone npm + Maven project and is intentionally **not** part of the pnpm workspace. It
consumes the emitter via the packed `.tgz` produced by `emitter/Build-TypeSpec.ps1`.

## Prerequisite

Install [Node.js](https://nodejs.org/en/download/) 20 or above. (Verify by running `node --version`)

Install [Java](https://docs.microsoft.com/java/openjdk/download) 11 or above. (Verify by running `java --version`)

Install [Maven](https://maven.apache.org/download.cgi). (Verify by running `mvn --version`)

## Build emitter, install, and generate code

Run from this (`emitter-tests`) folder:

```pwsh
pwsh ./Generate.ps1
```

`Generate.ps1` calls `Setup.ps1` (which builds the emitter jar + `.tgz` via
`emitter/Build-TypeSpec.ps1` and `npm install`s it here), then regenerates the SDK from the local
`tsp/` sources and the [http-specs]/[azure-http-specs] specs into the (gitignored) `src/main/java`
folder. This takes a while.

To only (re)build and install the emitter without regenerating, run `pwsh ./Setup.ps1`.

## Run the Spector tests

```pwsh
pwsh ./Spector-Tests.ps1
```

This starts the `tsp-spector` mock server, runs the JUnit tests (`mvn clean test`) against the
generated SDK, then stops the server. It also writes `tsp-spector-coverage-java.json`.

To start/stop the mock server manually (for example to run individual tests from your IDE):

```shell
npm run spector-start   # or: npm run spector-serve  (foreground)
npm run spector-stop
```

## Sync hand-written tests and specs from core

The hand-written JUnit tests under `src/test/java` and the local specs under `tsp/` are synced from
the unbranded test project in the `core/` submodule
(`core/packages/http-client-java/http-client-generator-test`). Refresh them with:

```pwsh
pwsh ./SyncTests.ps1
```

The Azure-specific customization classes under `customization/` are hand-maintained here and are
**not** synced from core.

## Generate code for a single TypeSpec source

```shell
npx tsp compile <target.tsp>
```

Useful for a quick check that a change to the emitter behaves as expected. Generated code is written
to `tsp-output/` for inspection.

## Troubleshooting

### New version of `@typespec/compiler` etc.

Force a clean install by deleting `node_modules` and `package-lock.json`, then re-run `Setup.ps1`:

```shell
rm -rf node_modules
rm package-lock.json
```

[http-specs]: https://github.com/microsoft/typespec/tree/main/packages/http-specs
[azure-http-specs]: https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs
