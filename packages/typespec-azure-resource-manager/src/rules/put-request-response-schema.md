PUT operations should accept and return the same resource shape. This rule compares
the native request body type with the `200` response body, or the `201` response
body when there is no `200` response. A mismatch produces one warning on the
operation.

Prefer the standard ARM create-or-replace templates, which use the resource model
for both bodies. When defining a custom operation, keep its request and response
properties, optionality, and property types consistent.

#### Incorrect

```typespec
model WidgetProperties {
  description?: string;
}
model WidgetRequestProperties {
  description?: string;
  requestMarker?: string;
}
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
model WidgetRequest is TrackedResource<WidgetRequestProperties> {
  ...ResourceNameParameter<WidgetRequest>;
}

@armResourceOperations
interface Widgets {
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrUpdate(...ResourceInstanceParameters<Widget>, @bodyRoot body: WidgetRequest):
    | ArmResponse<Widget>
    | ArmCreatedResponse<Widget>
    | ErrorResponse;
}
```

#### Correct

```typespec
model WidgetProperties {
  description?: string;
}
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

## Scope

The rule is available for ARM authoring and is disabled by default in the
resource-manager ruleset. Once enabled, it checks authored PUT operations,
including nested namespaces and operations without `@armProviderNamespace`.
Library declarations and uninstantiated operation or interface templates are
excluded.

The comparison uses native type structure, including inherited properties,
arrays, recursive models, and unions. Separate named open unions with equivalent
members match; unnamed union variants are matched one-to-one independently of
declaration order. Named variant labels and enum-member labels and effective
values remain significant. Direct enums and individual enum-member types use the
same comparison: an omitted value defaults to the member's name, so `enum A { state }`
and `enum B { state: "state" }` match. Explicit zero and empty-string values are
preserved rather than replaced by defaults.

Matching indexers do not bypass named-property comparison: property types,
optionality, counts, and inherited properties still matter. ARM's independent
`arm-no-record` warning discourages records for new APIs but permits suppression
when matching an existing API; it does not replace request/response equality.
Scalar comparison checks the name at each level of the base chain, so same-named
scalar declarations with incompatible underlying types do not match.

This is not an assignability check and does not compare emitted SDK
type names, serialization extensions, or historical version projections.

Operations without a request body, including a `void` request, are skipped.
Missing success response bodies are left to the ARM `no-response-body` rule.
A bodyless `200` response does not cause fallback to `201`; fallback is used only
when the `200` response is absent.

## Impact

- **Area:** API, SDK

Different request and response resource shapes make create-or-update APIs harder
to use consistently and can require callers to translate between distinct SDK
models. Keeping their native shapes aligned also makes API intent consistent
across emitters.

## Suppression

Fix the request or response model, preferably by using a standard ARM operation
template. Suppression is acceptable only for an intentional difference approved
by an ARM reviewer. Place
`#suppress "@azure-tools/typespec-azure-resource-manager/put-request-response-schema" "ARM-approved reason"`
immediately above the affected operation and document the reason.

## LintDiff Equivalent

Related validator: [PutRequestResponseSchemeArm](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-request-response-scheme-arm.md),
also listed in the [automated authoring guidelines](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#putrequestresponseschemearm).
The native rule intentionally does not reproduce Swagger-only differences in
SDK enum names, extension metadata, emitted member order, or missing response
schemas. These limits mean partial Swagger parity, not universal equivalence.
