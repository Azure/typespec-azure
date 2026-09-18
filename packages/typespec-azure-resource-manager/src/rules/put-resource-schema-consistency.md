Use the same resource model for an ARM PUT request and its `200` and `201`
response bodies. This keeps creation and replacement consistent and encourages
reuse of the resource model across operations. Prefer the standard ARM
create-or-replace operation templates.

This is a **model-reuse rule**, not a structural schema-equivalence check.
A type alias preserves model identity, but separately declared models, including
models declared with `is`, `extends`, or spread, remain distinct even when their
properties look identical. Share the resource model and express request/response
differences with lifecycle visibility rather than duplicating its declaration.

The rule compares the available request, exact `200`, and exact `201` bodies.
It still compares the responses when there is no request, and compares the
request with `201` when `200` is absent or bodyless. It does not require any of
these bodies or status codes. Other status codes, including `202` and ordinary
error responses, are outside this rule's scope.

Only ordinary bodies whose native type is a named, non-indexed model participate.
HTTP metadata can recover the original named model from some anonymous bodies
that reuse its properties, such as implicit bodies formed by spreading a model.
Headers and status-code wrappers do not become resource models. The rule compares
model identity, not serialized request/response property sets, so read-only and
write-only properties on a shared model do not cause warnings.

Anonymous bodies without a recoverable named model, scalars, unions, tuples,
arrays, dictionaries, multipart bodies, and file bodies are not compared.
If one status has multiple body types or body kinds, that status is skipped
regardless of variant order; any remaining identifiable participants are still
compared. Bodyless variants are ignored. Content types alone do not change
model identity. Skipping a body is not an assertion that it is otherwise valid.

When the participating models differ, the rule reports one warning on the
operation, identifying the models used by each body. It checks authored
declarations without emitter-specific version projections.

#### ❌ Incorrect

```typespec
model WidgetInput {
  value: string;
}

model Widget {
  value: string;
}

@put
op createOrReplace(@body body: WidgetInput): ArmResponse<Widget> | ArmCreatedResponse<Widget>;
```

#### ✅ Correct

```typespec
model Widget {
  @visibility(Lifecycle.Read)
  id: string;

  value: string;
}

@put
op createOrReplace(@body body: Widget): ArmResponse<Widget> | ArmCreatedResponse<Widget>;
```

## Impact

- **Area:** API, SDK

Different resource models for PUT input, creation, and replacement can fragment
the resource contract and make model reuse harder for API consumers. This rule
encourages a single authored resource model; it does not predict generated SDK
types or require identical serialized payloads across lifecycle visibilities.

## Suppression

For an existing API that intentionally uses separate models and cannot change
compatibly, suppress the warning with a justification. For new APIs, prefer
sharing one resource model or using the standard ARM operation templates.
The rule is registered as disabled in the resource-manager ruleset.

```typespec
#suppress "@azure-tools/typespec-azure-resource-manager/put-resource-schema-consistency" "Existing API uses separate request and response models."
@put
op createOrReplace(@body body: WidgetInput): ArmResponse<Widget>;
```

## LintDiff Equivalent

This native rule combines the intent of
[`PutRequestResponseSchemeArm`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#putrequestresponseschemearm)
and
[`ConsistentResponseSchemaForPut`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#consistentresponseschemaforput).
See the original
[request/response guideline](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-request-response-scheme-arm.md)
and
[response consistency guideline](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-response-schema-for-put.md).

The guidelines motivate resource reuse; their JavaScript schema comparisons
and emitted Swagger representations do not define this rule. In particular,
separate structurally equal models are not treated as the same resource model,
and unsupported native bodies are not forced into emitted-schema categories.
