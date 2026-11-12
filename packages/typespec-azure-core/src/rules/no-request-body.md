GET and DELETE operations must not have a request body. This applies to both data-plane and Azure Resource Manager APIs, regardless of which operation template is used.

The rule checks the resolved HTTP request body, including `@body`, `@bodyRoot`, multipart bodies, and implicit bodies formed from unannotated parameters. Optional bodies and explicitly declared empty-model bodies are still request bodies. Operations without a body, including a `void` body, are allowed. Other HTTP methods are not restricted by this rule.

## Impact

- **Area:** API, SDK

GET and DELETE request bodies do not have generally defined HTTP semantics and may be rejected or ignored by clients, proxies, and caches. Removing an existing request body can be a breaking API and generated-SDK change and may require a service-side change.

The examples assume `Widget` is already declared.

## ❌ Incorrect

### Data-plane operations

Passing body parameters to an RPC operation creates a request body:

```tsp
@route("/widgets")
@get
op readWidget is RpcOperation<
  {
    @body filter: {
      name: string;
    };
  },
  Widget
>;

@route("/widgets")
@delete
op deleteWidget is RpcOperation<
  {
    @body options: {
      force: boolean;
    };
  },
  {}
>;
```

### Azure Resource Manager

Adding a body through a standard ARM operation template's `Parameters` customization also creates a request body.

```tsp
model ReadParameters {
  @body filter: {
    name: string;
  };
}

model DeleteParameters {
  @body options: {
    force: boolean;
  };
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget, Parameters = ReadParameters>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget, Parameters = DeleteParameters>;
}
```

## ✅ Correct

### Data-plane operations

Use query parameters instead of a request body when the service supports them:

```tsp
@route("/widgets")
@get
op readWidget is RpcOperation<
  {
    @query name: string;
  },
  Widget
>;

@route("/widgets")
@delete
op deleteWidget is RpcOperation<
  {
    @query force: boolean;
  },
  {}
>;
```

### Azure Resource Manager

Keep the standard ARM read and delete operations bodyless:

```tsp
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
}
```

## Suppression

Suppress only when necessary to preserve an existing API whose service still requires a GET or DELETE request body. Apply `#suppress "@azure-tools/typespec-azure-core/no-request-body" "reason"` to the operation.

## LintDiff Origin

This rule implements the shared policy in [GetMustNotHaveRequestBody](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-must-not-have-request-body.md), [DeleteMustNotHaveRequestBody](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-must-not-have-request-body.md), and data-plane [RequestBodyNotAllowed](https://github.com/Azure/azure-openapi-validator/blob/main/docs/request-body-not-allowed.md). It reports a native warning once per operation with a resolved body, rather than a diagnostic per Swagger body parameter.

Unlike `rpc-operation-request-body`, it is not limited to operations derived from `Azure.Core.RpcOperation`. That existing rule remains unchanged for compatibility. Enabling both rules can produce both diagnostics for an RPC-derived operation.

The rule checks source operations, including operations outside a declared service. Client-only customization scope remains a separate policy question tracked in [#5993](https://github.com/Azure/typespec-azure/issues/5993).
