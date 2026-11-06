Azure Resource Manager GET operations must not have a request body.

The rule checks the resolved HTTP request body, including `@body`, `@bodyRoot`, multipart bodies, and implicit bodies formed from unannotated parameters. Optional bodies and explicitly declared empty-model bodies are still request bodies. Operations without a body, including a `void` body, are allowed.

## Impact

- **Area:** API, SDK

GET request bodies do not have generally defined HTTP semantics and may be rejected or ignored by clients, proxies, and caches. Removing an existing request body can be a breaking API and generated-SDK change and may require a service-side change.

## ❌ Incorrect

Assume `Widget` is already declared as an ARM resource. Adding a body through the standard ARM read template's `Parameters` customization creates a GET request body:

```tsp
model ReadParameters {
  @TypeSpec.Http.body filter: {
    name: string;
  };
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget, Parameters = ReadParameters>;
}
```

## ✅ Correct

Keep the GET operation bodyless:

```tsp
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

## Suppression

Suppress only when necessary to preserve an existing API whose service still requires a GET request body. Apply `#suppress "@azure-tools/typespec-azure-resource-manager/no-get-request-body" "reason"` to the operation.

## LintDiff Origin

This rule implements the ARM policy in [GetMustNotHaveRequestBody](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-must-not-have-request-body.md), guideline RPC-Get-V1-02. It reports a native warning once per GET operation with a request body, rather than a Swagger error per selected body parameter.

Unlike `@azure-tools/typespec-azure-core/rpc-operation-request-body`, it is not limited to operations derived from `Azure.Core.RpcOperation`. Enabling both rules can produce both diagnostics for a GET operation derived from that template.
