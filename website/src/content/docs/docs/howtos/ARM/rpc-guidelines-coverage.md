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

## Section 1: ARM Resource Path Structure

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
| 2.4 Resource references use fully qualified ARM resource IDs | —                                                               | ❌ 📐    | —                                                                                                                                                          | **Gap (customer-facing):** No rule validates that cross-resource references use full ARM resource IDs rather than decomposed subscription/RG/name properties.                                                                                                                                             |

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

## Coverage Summary

| Category                 | Count | Percentage |
| ------------------------ | ----- | ---------- |
| ✅ Fully covered         | 15    | 35%        |
| 🔶 Partially covered     | 7     | 16%        |
| 🔧 Enforced by templates | 6     | 14%        |
| ❌ Not covered           | 15    | 35%        |

### Breakdown of Uncovered Guidelines

Of the 15 uncovered guidelines, most fall into categories where automated linting is either not feasible or not appropriate:

#### 📐 Customer-Facing API Gaps (potential future linting rules)

These guidelines describe aspects of customer-facing APIs that could potentially be covered by TypeSpec linting rules:

- **Nested resource List operation** (Section 2.3): Validate that nested resources define a List operation under their parent.
- **No embedded child resources in parent GET** (Sections 2.3, 10.1 / ARG001): Detect when child resources are embedded inline in parent resource responses.
- **Resource references use ARM resource IDs** (Section 2.4): Validate that cross-resource references use fully qualified ARM resource IDs.
- **Secret retrieval via POST action** (Section 7.1): Validate that secrets are only exposed through `list*` POST actions.
- **No writable circular dependencies** (Section 8.5): Detect circular writable references between resources.
- **No dual inline/nested modeling** (Section 9.3): Detect when a collection is modeled as both an inline array property and a nested resource type.

#### 📐 Design Guidance (requires human judgment)

These guidelines provide design recommendations that are difficult to automate because they depend on context and intent:

- **Prefer enums over booleans** (Section 8.1): Booleans are sometimes appropriate, so this requires case-by-case review.
- **Use objects instead of strings for structured values** (Section 8.2): Whether a string is "structured" requires understanding the domain.
- **When to use inline vs. nested resources** (Sections 9.1–9.2): Decision depends on lifecycle, RBAC, and collection size considerations.
- **POST to create resources** (Section 12.2): POST creation is only allowed for proxy resources when the service generates the name — context-dependent.

#### 🔄 Service Runtime Behavior (not enforceable through API specification)

These guidelines describe service behavior that cannot be validated by examining the API description:

- **PUT idempotence** (Section 3.1): Requires the PUT operation to produce the same result when called multiple times.
- **No customer data in control plane** (Section 10.2 / ARG002): Data classification concern beyond API specification scope.
- **Incremental version progression** (Section 11.2): Operational process for version date ordering.

#### 🏗️ Internal ARM Infrastructure (not part of customer-facing API description)

These guidelines relate to internal ARM platform patterns:

- **Operation results as root-level resources** (Section 6.2): The `/operationResults` API placement is an ARM infrastructure pattern.
