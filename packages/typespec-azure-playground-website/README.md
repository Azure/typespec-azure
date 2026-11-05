# TypeSpec Azure Playground Website

A self contained website for the TypeSpec Azure Playground.

## Use

- `pnpm start` to start in dev mode
- `pnpm preview` to build and preview prod mode
- `pnpm build` to build for production

## Configuration

To change the default configuration add a `.env.local` file in the root of this package.

The following environment variables are available:

```.env
# Bundle and use local version of typespec libraries
VITE_USE_LOCAL_LIBRARIES=true
```

## Go client generation

Select `@azure-tools/typespec-go` and set a module identity in the playground's `tspconfig.yaml`:

```yaml
emit:
  - "@azure-tools/typespec-go"
options:
  "@azure-tools/typespec-go":
    module: example.com/playground
```

The browser generates Go source without running `gofmt`, `go mod tidy`, or `go generate`.
These steps still run when using the emitter from the command line.

## Java WASM proof of concept

Build the Java emitter and its TeaVM target from the repository root with JDK 17 or newer, then enable the opt-in playground integration:

```bash
mise install java@microsoft-17
mise exec java@microsoft-17 -- pnpm --filter @azure-tools/typespec-java build:wasm
VITE_JAVA_WASM_POC=true mise exec -- pnpm --filter @azure-tools/typespec-azure-playground-website start
```

Select `@azure-tools/typespec-java` for an Azure data-plane spec. The flag also enables local library bundles. The existing Java generator runs entirely in a lazily created Web Worker through TeaVM's WebAssembly GC backend; no server or local JVM is used for generation. Each emit gets a fresh worker to isolate the generator's process-global state.

This is an experimental browser target, not a replacement for the native emitter. ARM, SDK packaging, samples, tests, APIView metadata, customization, partial updates, and native formatting are excluded. The POC requires a browser supporting WebAssembly GC. Native CLI generation is unchanged.
