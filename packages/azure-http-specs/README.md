# Azure HTTP Specs

This package contains all the scenarios that should be supported by a client generator.

## Development

1. [FOLLOW THE MONOREPO INSTRUCTION](@azure-tools/typespec-azure-monorepo) to get the environment setup.
2. Scenarios should be in `./specs` folder

#### Writing scenarios

**PENDING**

#### Writing mockapis

**PENDING**

#### Validate the scenarios are valid

```
pnpm run validate-scenarios
```

#### Validate the mock apis are valid

```
pnpm run validate-mock-apis
```

#### Start mock api server

This will start the server using the mock apis. When writing a mock api use this command to start the server.

```bash
pnpm run serve
```
