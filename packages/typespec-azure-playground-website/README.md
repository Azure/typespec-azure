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

The normal repository build compiles the Java emitter and its two TeaVM targets with the pinned JDK 17. After building, start the playground without any feature flags:

```bash
mise exec -- pnpm --filter @azure-tools/typespec-azure-playground-website start
```

Select `@azure-tools/typespec-java` for an Azure data-plane or ARM spec. The playground loads only the matching WASM target: the data-plane generator or the ARM Fluent generator. Generation runs entirely in a lazily created Web Worker through TeaVM's WebAssembly GC backend; no server or local JVM is used. Each emit gets a fresh worker to isolate the generator's process-global state. A browser-only postprocessor removes unused Java imports before returning files.

This is an experimental browser target, not a replacement for the native emitter. SDK repository integration, samples, tests, APIView metadata, customization, partial updates, and native formatting are excluded. The POC requires a browser supporting WebAssembly GC. Native CLI generation is unchanged.
