# Azure HTTP Specs

This package contains all the scenarios that should be supported by a client generator.

## Development

1. [FOLLOW THE MONOREPO INSTRUCTION](@azure-tools/typespec-azure-monorepo) to get the environment setup.
2. Scenarios should be in `./specs` folder

#### Writing scenarios

Define scenarios that need to be supported in client generators. To have meaningful coverage we need scenarios to:

- have a specific behavior that is meant to be tested
  - ❌ DO NOT use the same scenario for testing multiple things.
- have a meaningful name that can be used in the dashboard to see what a given generator supports (e.g. get_string)
- a good description of what the scenario is validating (e.g. "Support passing a simple string as JSON")
- have a good description on what the client is expecting to generate/receive/send (e.g Validate that this operation returns a JSON string that match "abc")
  - ✅ DO describe how to validate that this scenario is working from the client point of view
- When naming scenario always think about what would it look like in the dashboard to ensure that the name will be meaningful to someone looking to see what is supported. To see how the scenario name will be used, check the [compatibility dashboard for existing scenarios](https://azurespecdashboard.z5.web.core.windows.net/).

```tsp
import "@typespec/spector";

@scenarioService("/path/for/scenario")
namespace String;

@scenario("get_string")
@doc("Support passing a simple string as JSON")
@scenarioDoc("In this scenario the Client should expect a string matching 'abc' to be returned.")
@get
@route("/simple")
op returnString(): string;
```

**PENDING LINK TO SPECTOR DOCS**

#### Writing mockapis

1. Create a `mockapi.ts` file next to the `main.tsp` of the scenario
2. Create and export a variable called `Scenarios` with a `Record<string, ScenarioMockApi>` type
3. For each of the scenarios assign a new property to the `Scenarios` variable. The property name should be in the following format: `<Scenario namespace>_<scenario operation name>`. The value can be:
   - `passOnSuccess`: This will take one or multiple routes and will only pass the scenario if all the routes gets called with a 2xx success code.

##### Example

```ts
import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.String_returnString = passOnSuccess([
  {
    uri: "/path/for/scenario/simple",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: "mystring",
    },
    kind: "MockApiDefinition",
  },
]);
```

##### How to build a response

Examples of response objects:

```ts
// Minimum requirement is the status code.
response: {
  status: 200,
};
```

##### Return a body

```ts
// Return json
response: {
  status: 200,
  body: json({ foo: 123 }),
};

// Return raw content
response: {
  status: 200,
  body: {
    contentType: "application/text",
    rawContent: "foobar",
  },
};
```

##### Return headers

```ts
// Return json
response: {
  status: 200,
  headers: {
      MyHeader: "value-1"
      MyHeaderOther: req.headers.MyRequestHeader
  }
};

```

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
