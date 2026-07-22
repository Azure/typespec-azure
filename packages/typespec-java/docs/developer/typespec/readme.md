# Developer Guide for TypeSpec Emitter

## TypeSpec Java

As [NPM package](https://www.npmjs.com/package/@azure-tools/typespec-java), it is the Java client [emitter](https://typespec.io/docs/extending-typespec/emitters-basics/) for Azure SDKs.

## Build and Test

At present, almost all the code of the emitter is in [microsoft/typespec repository](https://github.com/microsoft/typespec/tree/main/packages/http-client-java).

This repository is checked out at `core` folder as submodule.

### Build

The emitter NPM package is at the `packages/typespec-java` root.

Run `pnpm build` in `packages/typespec-java` to build the emitter: it builds the JAR
using Maven (`Build-Generator.ps1`), then compiles the emitter TypeScript
(`Copy-Sources.ps1` + `tsc`). The emitter and its e2e tests are a single npm package
(no `.tgz` pack step).

### Integrated Test

End-to-end tests reside in the `emitter-tests` folder, which is part of the
`@azure-tools/typespec-java` package (not a separate npm project). The hand-written
JUnit tests and local `tsp/` specs are synced verbatim from core via
[`SyncTests.ps1`](../../../SyncTests.ps1).

From `packages/typespec-java`, run `pnpm run regenerate`: the
[`Generate.ps1` script](../../../Generate.ps1) builds the emitter and
generates the test code from [http-specs](https://github.com/microsoft/typespec/tree/main/packages/http-specs)
and [azure-http-specs](https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs)
using the locally built emitter (resolved via `emitter-tests/tspconfig.yaml`).

Then run `pnpm run test:java:e2e` (Spector-Tests.ps1): `pnpm run spector-start` starts
the mock server and standard Maven Surefire runs the tests.

## Publish `@azure-tools/typespec-java` to NPM

1. Update `version` in `package.json`.
2. Update `CHANGELOG.md`, merge the PR.
3. Run "typespec-java - publish" in (internal) DevOps.
4. Update Release notes in [GitHub Releases](https://github.com/Azure/typespec-azure/releases).

## Debugging

### Debugging TypeScript Code

In project that runs TypeSpec compiler (e.g. `emitter-tests` folder), run

```shell
node --inspect-brk "node_modules/@typespec/compiler/dist/src/core/cli/cli.js" compile <tsp-file>
```

to run `tsp compile` in debug mode (as Node.js process).

Then, have the debugging client attach to port 9229 of the Node.js process.
Here is a [Visual Studio Code configuration](../../../emitter-tests/.vscode/launch.json).

Add break point to the `emitter.js` or `code-model-builder.js` under `node_modules/@azure-tools/typespec-java/dist/src` to debug the emitter.

### Debugging Java Code

See [Contributing guide](../../../CONTRIBUTING.md).

Alternatively, since the communication from TypeScript to Java is via the `code-model.yaml` file (plus the `EmitterOptions`), one can modify the `DEFAULT_OUTPUT_DIR` in `Main.java` under `core/packages/http-client-java/generator/http-client-generator` and debug `Main.main()`.

Notice:

- Add `--add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED --add-exports jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED` to VM options.
- There may be some difference of other option between `tspconfig.yaml` and `EmitterOptions.java`. Remember to temporarily modify `EmitterOptions.java` to reflect the option in `tspconfig.yaml` when running `Main.java` this way. For example, set `flavor` to `azure`.
