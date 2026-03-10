---
title: ARM RPC Guidelines and TypeSpec Linting Coverage
description: Correlation of ARM Resource Provider Contract guidelines to TypeSpec linting rules
---

## Introduction

Azure Resource Manager (ARM) defines a set of [Resource Provider Contract (RPC) guidelines](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html) that all ARM resource providers must follow. TypeSpec encodes many of these guidelines into linting rules that run during compilation, helping service authors catch violations early.

This page maps each RPC guideline to the TypeSpec linting rules that cover or partially cover it, identifies gaps, and categorizes uncovered guidelines to clarify whether additional linting coverage is needed.

## Coverage Legend

| Symbol | Meaning                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| ✅     | Fully covered by a TypeSpec linting rule or enforced by ARM TypeSpec templates        |
| 🔶     | Partially covered — some aspects are checked but not all                              |
| ❌     | No linting coverage                                                                   |
| 🔧     | Enforced by TypeSpec ARM templates/patterns rather than a linting rule                |
| 🏗️     | Internal ARM infrastructure concern — not part of the customer-facing API description |
| 🔄     | Service runtime behavior — not enforceable through API specification                  |
| 📐     | Design guidance — requires human judgment, not enforceable through automated linting  |

## RPC Rules Coverage by Rule Number

The following table lists each ARM RPC rule by its rule number and maps it to the TypeSpec linting rules that provide coverage. The **Category** column classifies uncovered rules to indicate whether a gap is actionable for TypeSpec linting.

Categories for uncovered rules:

- **Customer-facing API**: Describes aspects of the API specification that customers interact with — a gap here may warrant a future linting rule.
- **Service behavior**: Describes runtime behavior of the service — cannot be validated through API specification linting.
- **Internal ARM infrastructure**: Describes internal ARM platform concerns (e.g. resource move, subscription lifecycle) — not part of the customer-facing TypeSpec spec.

| RPC Rule | Description | Coverage | TypeSpec Rule(s) | Category |
| -------- | ----------- | -------- | ---------------- | -------- |
| RPC003 | Tracked resource types must support move | ❌ | — | Internal ARM infrastructure — resource move is configured in the ARM manifest, not in the TypeSpec API specification. |
| RPC004 | URI must follow ARM standard guidelines (well-formed GET/PUT/DELETE URI tuples) | 🔧 | — | Enforced by TypeSpec ARM resource templates (`TrackedResource`, `ProxyResource`) which generate correct URI structures. `arm/arm-resource-path-segment-invalid-chars` and `arm/arm-resource-key-invalid-chars` validate path characters. |
| RPC005 | Provisioning state semantics must be followed (terminal/non-terminal states) | 🔶 | `arm/arm-resource-provisioning-state` | The rule checks that a `provisioningState` property is properly configured. Runtime behavior (flipping states on PUT/PATCH/DELETE) is service behavior and cannot be linted. |
| RPC006 | Tracked resource types must support GET, PUT, PATCH, DELETE & LIST | 🔶 | `arm/arm-resource-operation`, `arm/no-resource-delete-operation` | `arm-resource-operation` validates operations have correct decorators and api-version parameters. `no-resource-delete-operation` checks resources with createOrUpdate also have delete. **Gap**: No single rule validates the complete set of required operations (GET, PUT, PATCH, DELETE, ListByRG, ListBySub). |
| RPC007 | Resource types must support PATCH for Tags | ✅ | `arm/arm-resource-patch`, `arm/patch-envelope` | `arm-resource-patch` checks that if a resource has `tags`, PATCH includes it. `patch-envelope` validates PATCH includes envelope properties (identity, managedBy, plan, sku, tags). |
| RPC008 | PUT, GET, PATCH & LIST must return the same resource schema | ✅ | `arm/arm-resource-operation-response` | Directly implements RPC 008 — validates that PUT, GET, PATCH, and LIST operations all return the same resource schema. |
| RPC009 | Use PUT for replace, PATCH for partial update (JSON merge-patch) | 🔧 | — | Enforced by ARM TypeSpec operation templates: `ResourceCreateOrUpdate` for PUT and `ResourceUpdate` for PATCH generate the correct patterns. |
| RPC010 | Use PUT or PATCH to update a resource, not POST | ❌ 📐 | — | Design guidance — no rule prevents using POST for what should be a resource update. `arm/arm-resource-invalid-action-verb` ensures actions use POST/GET verbs but does not check intent. |
| RPC011.a | PUT on parent must not implicitly create tracked child resources | ❌ 📐 | — | Customer-facing API — no rule detects implicit child resource creation in PUT request bodies. |
| RPC011.b | PUT on parent should avoid implicitly creating proxy child resources | ❌ 📐 | — | Customer-facing API — same gap as RPC011.a. This rule is still being refined. |
| RPC012 | Secret property semantics (no secrets in GET/PUT/PATCH responses, use POST list* action) | 🔶 | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks properties with sensitive names (password, key, token, etc.) are marked `@secret`. **Gap**: Does not validate that secrets are omitted from GET/PUT/PATCH responses or that retrieval is only via POST `list*` actions. |
| RPC013 | Resource must define a property bag; should include provisioningState | ✅ | `arm/arm-resource-provisioning-state`, `arm/arm-resource-invalid-envelope-property` | `arm-resource-provisioning-state` checks for a properly configured `provisioningState`. `arm-resource-invalid-envelope-property` ensures RP-specific properties are inside the `properties` bag. ARM base types (`TrackedResource`, `ProxyResource`) enforce the property bag structure. |
| RPC014 | POST action must operate on single resource | 🔶 | `arm/arm-resource-invalid-action-verb` | Validates that actions use POST or GET verbs. **Gap**: Does not check whether POST is used on a collection vs. a single resource instance. |
| RPC015 | PUT APIs that only return 200 (should also support 201/202 for creation) | ✅ | [`arm/arm-put-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/put-operation-response-codes) | Validates that PUT operations have the appropriate status codes including 201 for creation. |
| RPC016 | Responses must include id, name, type; RP content inside properties | ✅ | `arm/arm-resource-invalid-envelope-property`, `arm/arm-resource-operation-response` | `arm-resource-invalid-envelope-property` validates envelope properties come from Azure.ResourceManager namespace. ARM base types enforce id, name, type. `arm-resource-operation-response` ensures consistent schema across operations. |
| RPC019 | No resources of other types in response (RBAC violation / info leak) | ❌ 📐 | — | Customer-facing API — no rule detects when a response includes full content of resources of different types. Related to ARG001. |
| RPC020 | Circular dependencies between resources (read-only back-references) | ❌ 📐 | — | Customer-facing API — no rule detects writable circular references between resources. One reference should be marked `readOnly`. |
| RPC021 | operationResults must be a top-level resource type | ❌ | — | Internal ARM infrastructure — `/operationResults` API placement is an ARM platform pattern, not described in TypeSpec resource provider specs. |
| RPC022 | Identifiers for operationResults must be unique (use GUIDs, not hashes) | ❌ | — | Internal ARM infrastructure / service behavior — identifier generation strategy is a runtime implementation concern. |
| RPC023 | DELETE should always be honored (never reject DELETE on bad state) | ❌ 🔄 | — | Service behavior — whether DELETE is accepted regardless of resource state is a runtime implementation concern, not an API specification concern. |
| RPC024 | Prefer header-based async timeout over manifest-based | ❌ | — | Internal ARM infrastructure — async timeout configuration is in the ARM manifest, not in the TypeSpec API specification. |
| RPC025 | 201 is the recommended async pattern (201 + provisioningState + Azure-AsyncOperation) | 🔶 | [`arm/arm-put-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/put-operation-response-codes), [`arm/lro-location-header`](/docs/libraries/azure-resource-manager/rules/lro-location-header), `arm/retry-after` | PUT response codes are validated. LRO Location header and Retry-After are checked. **Gap**: No rule specifically recommends 201 + provisioningState as the preferred async pattern over alternatives. |
| RPC026 | Resource provider must implement subscription lifecycle contract | ❌ | — | Internal ARM infrastructure — subscription lifecycle (register/unregister) is an internal ARM contract, not part of the customer-facing TypeSpec spec. POST `/register` in operations API is covered by `arm/missing-operations-endpoint`. |
| RPC027 | SystemData support (createdBy, createdAt, etc.) | 🔧 | — | Enforced by ARM TypeSpec base types — `TrackedResource` and `ProxyResource` automatically include `systemData` in the resource model. |
| RPC028 | Async operation tracking URI must follow ARM guidelines | 🔶 | [`arm/lro-location-header`](/docs/libraries/azure-resource-manager/rules/lro-location-header) | Validates 202 responses include a Location header. **Gap**: Does not validate the specific URI format or that it points to the ARM front door. |
| RPC029 | FQDNs must use auto-generated domain name labels (prevent subdomain takeover) | ❌ 🔄 | — | Service behavior — domain label generation strategy is a runtime implementation concern using the AzureDNS Deterministic Names library. |
| RPC030 | Avoid excessive resource type nesting (max 3 levels for tracked) | ✅ | `arm/beyond-nesting-levels` | Ensures tracked resources use 3 or fewer levels of nesting. |
| RPC031 | Unsupported query parameters (sub, subId, subscription, subscriptionId) | ❌ | — | Internal ARM infrastructure — ARM proxy behavior for query parameters is handled by the ARM platform, not by the resource provider's API specification. |

### RPC Rules Coverage Summary

| Coverage Level | Count | Rules |
| -------------- | ----- | ----- |
| ✅ Fully covered or enforced by templates | 12 | RPC004, RPC007, RPC008, RPC009, RPC013, RPC015, RPC016, RPC027, RPC030 (linting); RPC004, RPC009, RPC027 (templates) |
| 🔶 Partially covered | 6 | RPC005, RPC006, RPC012, RPC014, RPC025, RPC028 |
| ❌ Not covered — internal ARM infrastructure | 6 | RPC003, RPC021, RPC022, RPC024, RPC026, RPC031 |
| ❌ Not covered — service runtime behavior | 3 | RPC023, RPC029, RPC005 (runtime aspects) |
| ❌ Not covered — customer-facing API gaps | 4 | RPC010, RPC011.a, RPC011.b, RPC019, RPC020 |

---

## Detailed Coverage by Topic

The following sections provide a more detailed breakdown of coverage organized by topic area, with links to specific rule documentation.

### Section 1: ARM Resource Path Structure

| RPC Guideline                                    | RPC ID(s)                    | Coverage | TypeSpec Rule(s)                  | Notes                                                                                          |
| ------------------------------------------------ | ---------------------------- | -------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1.1 Tracked resource paths under subscription/RG | RPC-Put-V1-01, RPC-Get-V1-11 | 🔧       | —                                 | Enforced by `TrackedResource` base type, which generates correct path structure automatically. |
| 1.2 Proxy resource paths                         | —                            | 🔧       | —                                 | Enforced by `ProxyResource` base type.                                                         |
| 1.3 Resource provider namespace consistency      | RPC-Put-V1-06                | 🔧       | —                                 | Enforced by `@armProviderNamespace` decorator which sets the namespace in paths.               |
| 1.4 Operations API endpoint required             | RPC-Operations-V1            | ✅       | `arm/missing-operations-endpoint` | Checks that every ARM namespace includes an Operations interface.                              |

## Section 2: ARM Resource Model Rules

| RPC Guideline                                                | RPC ID(s)                                                       | Coverage | TypeSpec Rule(s)                                                                                                                                           | Notes                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 PUT response must be an ARM Resource                     | RPC-Put-V1-12                                                   | ✅       | `arm/arm-resource-operation-response`, [`arm/arm-put-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/put-operation-response-codes) | RPC 008 validates PUT/GET/PATCH/LIST return the same resource schema. PUT response codes are also validated. ARM base types ensure `x-ms-azure-resource` is set.                                                                                                                                          |
| 2.2 Tracked resources must have all required operations      | RPC-Get-V1-01, RPC-Put-V1-01, RPC-Patch-V1-03, RPC-Delete-V1-01 | 🔶       | `arm/arm-resource-operation`, [`arm/no-resource-delete-operation`](/docs/libraries/azure-resource-manager/rules/no-resource-delete-operation)              | `arm-resource-operation` validates operations have correct decorators. `no-resource-delete-operation` checks that resources with createOrUpdate also have delete. No rule explicitly checks for the presence of all required operations (GET, PUT, PATCH, DELETE, ListByRG, ListBySub) as a complete set. |
| 2.3 Nested resources must have List under parent             | —                                                               | ❌ 📐    | —                                                                                                                                                          | **Gap (customer-facing):** No rule validates that nested resources define a List operation under their parent.                                                                                                                                                                                            |
| 2.3 Nesting depth limit                                      | —                                                               | ✅       | `arm/beyond-nesting-levels`                                                                                                                                | Ensures tracked resources use 3 or fewer nesting levels.                                                                                                                                                                                                                                                  |
| 2.3 No embedded nested resources in parent GET               | ARG001                                                          | ❌ 📐    | —                                                                                                                                                          | **Gap (customer-facing):** No rule prevents embedding child resources inline in parent GET response. See also Section 10.1.                                                                                                                                                                               |
| 2.4 Resource references use fully qualified ARM resource IDs | —                                                               | 🔧 📐   | —                                                                                                                                                          | TypeSpec provides the `armResourceIdentifier` scalar in `Azure.Core` for this purpose, which enforces the `arm-id` format and allows specifying allowed resource types and scopes. However, no linting rule can reliably detect that a plain `string` property is *intended* to hold a resource reference — that requires domain knowledge. The tooling support exists; usage is a design-time decision. See [ARM Resource Types](./resource-type.md). |

## Section 3: PUT Operation Rules

| RPC Guideline                               | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                              | Notes                                                                                                                                                                  |
| ------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Resources must expose PUT for creation  | —         | 🔧       | —                                                                             | Enforced by ARM TypeSpec operation templates (`ResourceCreateOrUpdate`).                                                                                               |
| 3.1 PUT must be idempotent                  | —         | ❌ 🔄    | —                                                                             | Service runtime behavior — cannot be validated through API specification.                                                                                              |
| 3.2 PUT must not expose secrets in response | —         | 🔶       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks that properties with sensitive names (password, key, token, etc.) are marked `@secret`. Does not validate that secrets are omitted from responses specifically. |

## Section 4: PATCH Operation Rules

| RPC Guideline                                    | RPC ID(s)       | Coverage | TypeSpec Rule(s)                                                              | Notes                                                                                                                                                    |
| ------------------------------------------------ | --------------- | -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 PATCH body must not have required properties | RPC-Patch-V1-10 | ✅       | `arm/arm-resource-patch`                                                      | Validates PATCH request body model properties. ARM TypeSpec templates automatically generate separate update models.                                     |
| 4.2 Tracked resource PATCH must support tags     | RPC-Patch-V1-03 | ✅       | `arm/arm-resource-patch`, `arm/patch-envelope`                                | `arm-resource-patch` checks tags are included. `patch-envelope` validates envelope properties (identity, managedBy, plan, sku, tags) match the resource. |
| 4.2 Resources should have updateable properties  | —               | ✅       | `arm/empty-updateable-properties`                                             | Checks that resources with update operations have at least one updateable property.                                                                      |
| 4.3 PATCH must not expose secrets in response    | —               | 🔶       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Same as PUT — checks sensitive property names but does not validate omission from responses.                                                             |

## Section 5: DELETE Operation Rules

| RPC Guideline                                                | RPC ID(s)                         | Coverage | TypeSpec Rule(s)                                                                                                          | Notes                                                                                          |
| ------------------------------------------------------------ | --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 5.1 DELETE response codes (200, 204, default; 202 for async) | RPC-Delete-V1-01, RPC-Async-V1-09 | ✅       | [`arm/arm-delete-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/delete-operation-response-codes) | Validates correct status codes for both sync and async DELETE operations.                      |
| 5.2 DELETE must not have a request body                      | —                                 | 🔧       | —                                                                                                                         | Enforced by ARM TypeSpec operation templates which do not include a body parameter for DELETE. |

## Section 6: Long-Running Operations (LRO)

| RPC Guideline                                                    | RPC ID(s)    | Coverage | TypeSpec Rule(s)                                                                              | Notes                                                                                                                            |
| ---------------------------------------------------------------- | ------------ | -------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 LRO 202 must include Location or Azure-AsyncOperation header | RPC-Async-V1 | ✅       | [`arm/lro-location-header`](/docs/libraries/azure-resource-manager/rules/lro-location-header) | Validates 202 responses include a Location header.                                                                               |
| 6.1 LRO 200/201 response must have a schema                      | RPC-Async-V1 | ✅       | [`arm/no-response-body`](/docs/libraries/azure-resource-manager/rules/no-response-body)       | Checks that non-204 success responses have a body and 202/204 responses do not.                                                  |
| 6.1 LRO Retry-After header                                       | —            | ✅       | `arm/retry-after`                                                                             | Checks that LRO responses (201/202) include a Retry-After header.                                                                |
| 6.2 Operation results as root-level resources                    | —            | ❌ 🏗️    | —                                                                                             | Internal ARM infrastructure concern — `/operationResults` placement is an ARM platform pattern, not described in TypeSpec specs. |

## Section 7: Secret Handling & Sensitive Data

| RPC Guideline                                | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                              | Notes                                                                                                                                                                                                       |
| -------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 No secrets in GET/PUT/PATCH responses    | —         | 🔶       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Validates that properties with sensitive names are marked `@secret`. The `@secret` decorator drives correct code generation, but the rule does not verify secrets are omitted from specific response types. |
| 7.1 Secret retrieval via POST `list*` action | —         | ❌ 📐    | —                                                                             | **Gap (customer-facing):** No rule validates that secrets are exposed only via POST `list*` actions for granular RBAC control.                                                                              |
| 7.2 `x-ms-secret` annotation                 | RPC-v1-13 | ✅       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks that sensitive properties are annotated with `@secret`, which generates `x-ms-secret: true`.                                                                                                         |

## Section 8: Property Design Best Practices

| RPC Guideline                                            | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                           | Notes                                                                                                                                                                   |
| -------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 Prefer enums over booleans                           | —         | ❌ 📐    | —                                                                                          | Design guidance requiring human judgment. Difficult to automate — booleans are sometimes appropriate.                                                                   |
| 8.2 Use objects instead of strings for structured values | —         | ❌ 📐    | —                                                                                          | Design guidance requiring human judgment.                                                                                                                               |
| 8.3 Use enums for finite value sets                      | —         | 🔶       | [`core/no-enum`](/docs/libraries/azure-core/rules/no-enum)                                 | Azure Core recommends extensible unions over enums, which aligns with ARM's preference for extensible types. Does not detect when a free-form string should be an enum. |
| 8.4 Visibility and mutability                            | —         | 🔶       | [`core/key-visibility-required`](/docs/libraries/azure-core/rules/key-visibility-required) | Checks key properties have visibility settings. No rule validates that create-only or read-only properties are properly annotated in general.                           |
| 8.5 Avoid writable circular dependencies                 | —         | ❌ 📐    | —                                                                                          | **Gap (customer-facing):** No rule detects writable circular references between resources. This affects ARM template dependency ordering.                               |

## Section 9: Inline Properties vs. Nested Resources

| RPC Guideline                                   | RPC ID(s) | Coverage | TypeSpec Rule(s) | Notes                                                                                                                                |
| ----------------------------------------------- | --------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 9.1–9.2 When to use inline vs. nested resources | —         | ❌ 📐    | —                | Design guidance requiring human judgment based on lifecycle, RBAC, and collection size.                                              |
| 9.3 Never model both inline and nested          | —         | ❌ 📐    | —                | **Gap (customer-facing):** No rule detects when a collection is modeled as both an inline array property and a nested resource type. |

## Section 10: Azure Resource Graph (ARG) Compatibility

| RPC Guideline                                               | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                           | Notes                                                                                                                   |
| ----------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 10.1 No embedded child resources in parent GET (ARG001)     | ARG001    | ❌ 📐    | —                                                                                          | **Gap (customer-facing):** No rule prevents embedding child resources or child counts in parent resource GET responses. |
| 10.2 No customer data in control plane properties (ARG002)  | ARG002    | ❌ 🔄    | —                                                                                          | Data classification concern — cannot be reliably detected through API specification linting.                            |
| 10.3 Do not remove properties between API versions (ARG003) | ARG003    | 🔶       | [`core/non-breaking-versioning`](/docs/libraries/azure-core/rules/non-breaking-versioning) | Checks for backward compatible versioning changes. May not catch all property removal scenarios across API versions.    |

## Section 11: API Version Practices

| RPC Guideline                            | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                                                                     | Notes                                                                                                                |
| ---------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 11.1 Uniform versioning within a service | —         | 🔧       | —                                                                                                                                    | Enforced by TypeSpec versioning model — all resource types in a namespace share the same version enum.               |
| 11.2 Incremental version progression     | —         | ❌ 🔄    | —                                                                                                                                    | Operational process concern — GA versions must have a later date than preview. Not enforceable through spec linting. |
| API version parameter required           | —         | ✅       | [`core/operation-missing-api-version`](/docs/libraries/azure-core/rules/operation-missing-api-version), `arm/arm-resource-operation` | Both rules validate operations include an api-version parameter.                                                     |
| Version format validation                | —         | ✅       | `arm/arm-resource-invalid-version-format`                                                                                            | Checks that version strings use valid ARM version formats.                                                           |

## Section 12: POST Actions

| RPC Guideline                                | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                                                        | Notes                                                                                                    |
| -------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 12.1 POST actions must use POST or GET verbs | —         | ✅       | [`arm/arm-resource-invalid-action-verb`](/docs/libraries/azure-resource-manager/rules/arm-resource-invalid-action-verb) | Validates that action operations use only POST or GET HTTP verbs.                                        |
| 12.1 POST response codes                     | —         | ✅       | [`arm/arm-post-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/post-operation-response-codes)   | Validates correct status codes for POST operations.                                                      |
| 12.2 POST to create resources (proxy only)   | —         | ❌ 📐    | —                                                                                                                       | Design guidance — POST creation is only allowed for proxy resources when the service generates the name. |

## Additional ARM TypeSpec Rules

The following TypeSpec linting rules enforce ARM conventions that are not explicitly called out as individual RPC guidelines but support overall ARM compliance:

| TypeSpec Rule                                   | Description                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `arm/arm-common-types-version`                  | Requires specifying the ARM common-types version using `@armCommonTypesVersion`.                   |
| `arm/arm-no-record`                             | Prevents use of `Record` types for ARM resources, which produce `additionalProperties` in OpenAPI. |
| `arm/arm-resource-duplicate-property`           | Warns about duplicate properties in resource definitions.                                          |
| `arm/arm-resource-interface-requires-decorator` | Requires `@armResourceOperations` decorator on resource interfaces.                                |
| `arm/arm-resource-invalid-envelope-property`    | Validates that resource envelope properties come from `Azure.ResourceManager` namespace.           |
| `arm/arm-resource-key-invalid-chars`            | Ensures resource key contains only alphanumeric characters.                                        |
| `arm/arm-resource-name-pattern`                 | Requires a `pattern` restriction on resource name parameters.                                      |
| `arm/arm-resource-path-segment-invalid-chars`   | Validates path segments contain only valid characters.                                             |
| `arm/arm-resource-provisioning-state`           | Checks for a properly configured `provisioningState` property.                                     |
| `arm/improper-subscription-list-operation`      | Ensures tenant and extension resources don't define list-by-subscription operations.               |
| `arm/missing-x-ms-identifiers`                  | Requires array properties to describe identifying properties with `x-ms-identifiers`.              |
| `arm/no-empty-model`                            | Prevents ARM properties with `type: object` that don't reference a model definition.               |
| `arm/unsupported-type`                          | Checks for unsupported ARM types.                                                                  |

## Identified Gaps — Customer-Facing API Rules Without Coverage

The following RPC rules describe customer-facing API aspects that are not currently covered by TypeSpec linting rules and could potentially benefit from future linting rules:

| RPC Rule | Gap Description |
| -------- | --------------- |
| RPC006 | No single rule validates the complete set of required operations (GET, PUT, PATCH, DELETE, ListByRG, ListBySub) for tracked resources. Individual operations are checked separately. |
| RPC010 | No rule prevents using POST for what should be a resource update (PUT or PATCH). |
| RPC011.a | No rule detects implicit tracked child resource creation in PUT request bodies. |
| RPC011.b | No rule detects implicit proxy child resource creation in PUT request bodies. |
| RPC012 | `secret-prop` marks sensitive properties but does not validate that secrets are omitted from GET/PUT/PATCH responses or that retrieval is only via POST `list*` actions. |
| RPC014 | `arm-resource-invalid-action-verb` checks verbs but does not validate whether POST targets a single resource vs. a collection. |
| RPC019 | No rule detects when a response includes full content of resources of different types (RBAC/info leak risk). |
| RPC020 | No rule detects writable circular references between resources; one reference should be marked `readOnly`. |
| RPC025 | Response codes and LRO headers are checked, but no rule specifically recommends the 201 + provisioningState pattern as the preferred async approach. |
| RPC028 | LRO Location header presence is checked, but the specific URI format and ARM front door target are not validated. |
