---
validatorRuleId: AllResourcesMustHaveGetOperation
engine: native
tspLints:
  - tsp-lintdiff-local-linter/all-resources-must-have-get-operation
coverageKind: lint
---

# AllResourcesMustHaveGetOperation

**Severity:** warning

**Applies to:** Resource Manager (ARM)

All ARM resources with authorable PUT or PATCH lifecycle operations must also define a GET/read
operation.

Clients need a resource read operation to retrieve the state created or changed by a write.
Define `ArmResourceRead<Resource>` alongside the create/update operations. A collection list does
not replace a read of an individual resource. Delete-only resources are outside this rule's scope.

For an existing `Widget` resource, this interface is incorrect:

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmResourcePatchSync<Widget, {}>;
}
```

Add the read operation to correct it:

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmResourcePatchSync<Widget, {}>;
  get is ArmResourceRead<Widget>;
}
```

These examples use the standard ARM operation templates. Their native tests supply the imports,
service declaration, and a `TrackedResource<{}>` model with `ResourceNameParameter<Widget>`.

## Native rule contract

- **Concept and API:** inspect resources registered with the ARM library using `getArmResources`.
  A `createOrUpdate` or `update` lifecycle operation requires a `read` lifecycle operation.
- **Diagnostic:** one warning per offending resource, on its lifecycle operation's interface;
  fall back to a list/action interface and then the resource model when necessary. Having both
  PUT and PATCH does not produce two warnings.
- **Applicability:** native ARM resource metadata, not provider-name or generated-route guessing.
  Resource operations can be composed individually; using the composite
  `TrackedResourceOperations` interface is not required.
- **Prior art:** official `no-resource-delete-operation` uses the same resource/lifecycle metadata
  and interface/model targeting for DELETE. Official `arm-resource-operation` checks decorators
  on operations that exist, not missing GET. Agent child lifecycle enforcement applies only to
  Conversation/Response resources under an Agent, not to generic ARM resources.
- **Destination:** Azure Resource Manager, with a native name consistent with
  `no-resource-delete-operation`. No emitter, OpenAPI, or client-generator dependency is required
  by the production check.
- **Coverage:** native tests prove PUT-only, PATCH-only, PUT+PATCH deduplication, exact interface
  targeting, GET compliance, DELETE-only compliance, list-versus-read distinction, and distinct
  resources sharing an interface. Comparison fixtures additionally retain nested-resource evidence.

## LintDiff equivalent

Original validator:
[code](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/native/legacyRules/AllResourcesMustHaveGetOperation.ts)
and
[documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/all-resources-must-have-get-operation.md).

The upstream validator implementation effectively checks ARM resources that have PUT or PATCH
operations and reports when the same resource has no GET operation. It also ignores polymorphic
concrete resources whose base resource carries a discriminator.

The local lint covers the authorable TypeSpec matrix for that behavior:

- top-level resource with create/update behavior but no get => invalid
- nested resource with create/update behavior but no get => invalid
- patch-only resource with no get => invalid
- resource with get + write operations => valid
- resource with no put/patch operations => valid for this rule

The native rule retains the discriminator-ancestor exemption. A clean supported polymorphic ARM
fixture has not been established here: investigated legacy shapes trigger unrelated ARM diagnostics.
This is a coverage limitation, not proof that every such shape is unrepresentable or that the
exemption has universally equivalent behavior.

Raw OpenAPI-only `x-ms-azure-resource` shapes that are not modeled as ARM resources in TypeSpec are
also outside this native lint's scope.

The native check uses registered lifecycle roles, not response-schema references. A legacy HTTP GET
without ARM read metadata does not satisfy it; a registered ARM read whose custom response is an
array or empty body still does. Those differences are not evidence of identical Swagger behavior.
See [migration evidence](migration.md) for project-level explanations and limitations.

## Test Cases

| ID                   | Violation | Description                                                              |
| -------------------- | --------- | ------------------------------------------------------------------------ |
| `missing-get`        | yes       | Top-level tracked resource with createOrUpdate but no get                |
| `nested-missing-get` | yes       | Nested child resource still requires get when createOrUpdate exists      |
| `patch-without-get`  | yes       | Patch-only resources are also in scope                                   |
| `has-get`            | no        | Resource with get + write operations is compliant                        |
| `delete-only-no-get` | no        | Resources without put/patch operations are outside the implemented scope |
