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
