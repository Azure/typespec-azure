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
