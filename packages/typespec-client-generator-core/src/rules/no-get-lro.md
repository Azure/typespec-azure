GET SDK operations must not be marked as long-running with `Legacy.markAsLro`. A GET reads an existing resource or operation result; marking it as long-running makes SDKs treat that read as an initiating LRO.

The rule checks accepted Legacy markers in any language scope, including language-specific and exclusion scopes, and reports once per operation. It is enabled by the `client-sdk` and TCGC `all` rulesets without requiring an emitter.

## ❌ Incorrect

```tsp
@Azure.ClientGenerator.Core.Legacy.markAsLro
@get
@route("/operationResults/{id}")
op getOperationResult(@path id: string): {
  status: string;
};
```

## ✅ Correct

Remove an erroneous marker from the GET operation. Mark a non-GET operation when it initiates the long-running work.

```tsp
@get
@route("/operationResults/{id}")
op getOperationResult(@path id: string): {
  status: string;
};
```

For an approved existing API compatibility exception, preserve the Legacy declaration and suppress this rule with a justification:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/no-get-lro" "Approved existing API compatibility."
@Azure.ClientGenerator.Core.Legacy.markAsLro
@get
@route("/operationResults/{id}")
op getOperationResult(@path id: string): {
  status: string;
};
```

Suppressing a different Legacy diagnostic does not suppress this GET-specific warning. Rejected or ineffective Legacy declarations remain handled by their existing diagnostics.

## Migration scope

This rule covers accepted Legacy-marked GET operations associated with the Swagger validator [GetOperationMustNotBeLongRunning](https://github.com/Azure/azure-openapi-validator/blob/e1b8b207a196cf2fc288593efec22e6e38ab98d5/docs/get-operation-must-not-be-long-running.md). Native LRO metadata without an accepted Legacy marker, and raw Swagger LRO extensions or options without that marker, are outside this rule.
