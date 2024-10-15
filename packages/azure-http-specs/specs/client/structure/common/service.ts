import { MockApiDefinition, MockRequest } from "@typespec/spec-api";

export function createServerTests(uri: string): MockApiDefinition {
  return {
    uri: uri,
    method: "post",
    request: {},
    response: { status: 204 },
    handler: (req: MockRequest) => {
      return { status: 204 };
    },
    kind: "MockApiDefinition",
  };
}
