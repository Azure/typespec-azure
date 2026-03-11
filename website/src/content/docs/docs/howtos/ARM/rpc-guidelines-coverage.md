---
title: ARM RPC Guidelines and TypeSpec Linting Coverage
description: Correlation of ARM Resource Provider Contract guidelines to TypeSpec linting rules
---

## Introduction

Azure Resource Manager (ARM) defines a set of [Resource Provider Contract (RPC) guidelines](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html) that all ARM resource providers must follow. TypeSpec encodes many of these guidelines into linting rules that run during compilation, helping service authors catch violations early.

This page maps each RPC guideline to the TypeSpec linting rules that cover or partially cover it, identifies gaps, and categorizes uncovered guidelines. Where TypeSpec linting cannot enforce a guideline — whether due to infrastructure, runtime, or design concerns — **service owners are responsible for verifying compliance** through other means such as runtime tests, design reviews, or manual validation.

## Coverage Legend

| Symbol | Meaning                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | Fully covered by a TypeSpec linting rule or enforced by ARM TypeSpec templates                                                                                       |
| 🔶     | Partially covered — some aspects are checked but not all. **Service owners must verify the uncovered aspects through other means** (see notes for each rule).        |
| ❌     | No linting coverage                                                                                                                                                  |
| 🔧     | Enforced by TypeSpec ARM templates/patterns rather than a linting rule                                                                                               |
| ❌ 🏗️  | No linting coverage — internal ARM infrastructure concern not part of the customer-facing API description. Service owners must address through ARM manifest or other ARM platform mechanisms.  |
| ❌ 🔄  | No linting coverage — service runtime behavior not enforceable through API specification. Service owners must verify through runtime testing and operational validation. |
| ❌ 📐  | No linting coverage — design guidance requiring human judgment. Service owners must verify through design reviews.                                                    |
| 🔶 🔄  | Partially covered — uncovered aspects are service runtime behavior. Service owners must verify through runtime testing.                                              |
| 🔶 📐  | Partially covered — uncovered aspects require human design judgment. Service owners must verify through design reviews.                                              |

## RPC Rules Coverage by Rule Number

The following table lists each ARM RPC rule by its rule number and maps it to the TypeSpec linting rules that provide coverage.

Rules without linting coverage fall into three categories:

- **❌ 🏗️ Internal ARM infrastructure**: Describes internal ARM platform concerns (e.g. resource move, subscription lifecycle) — not part of the customer-facing TypeSpec spec. Service owners must configure these through the ARM manifest or other ARM platform mechanisms.
- **❌ 🔄 Service runtime behavior**: Describes runtime behavior of the service — cannot be validated through API specification linting. Service owners must verify compliance through runtime integration tests and operational monitoring.
- **❌ 📐 Design guidance**: Requires human judgment or domain knowledge that cannot be reliably automated. Service owners must verify compliance through API design reviews.

For **🔶 partially covered** rules, TypeSpec linting covers some but not all aspects. The **Notes** column describes what is and is not covered, and **service owners are responsible for verifying the uncovered aspects** — specific suggestions are provided where possible.

| RPC Rule | Description | Coverage | TypeSpec Rule(s) | Notes |
| -------- | ----------- | -------- | ---------------- | ----- |
| RPC003 | Tracked resource types must support move | ❌ 🏗️ | — | Resource move is configured in the ARM manifest, not in the TypeSpec API specification. **Service owners** must configure resource move support in the ARM manifest. |
| RPC004 | URI must follow ARM standard guidelines (well-formed GET/PUT/DELETE URI tuples) | 🔧 | `arm/arm-resource-path-segment-invalid-chars`, `arm/arm-resource-key-invalid-chars` | Enforced by TypeSpec ARM resource templates (`TrackedResource`, `ProxyResource`) which generate correct URI structures. Path character rules provide additional validation. |
| RPC005 | Provisioning state semantics must be followed (terminal/non-terminal states) | 🔶 🔄 | `arm/arm-resource-provisioning-state` | The rule checks that `provisioningState` is an open union containing the correct terminal states (Succeeded, Failed, Canceled). Runtime behavior (transitioning states on PUT/PATCH/DELETE) cannot be linted. **Service owners** must verify correct provisioning state transitions through integration tests covering resource lifecycle (create, update, delete). |
| RPC006 | Tracked resource types must support GET, PUT, PATCH, DELETE & LIST | 🔶 | `arm/arm-resource-operation`, `arm/no-resource-delete-operation` | `arm-resource-operation` validates operations have correct decorators. `no-resource-delete-operation` checks resources with createOrUpdate also have delete. **Gap**: No single rule validates the complete set of required operations (GET, PUT, PATCH, DELETE, ListByRG, ListBySub) for tracked resources — a linting rule could and should be added. **Service owners** should verify the complete operation set through API design review until such a rule exists. |
| RPC007 | Resource types must support PATCH for Tags | ✅ | `arm/arm-resource-patch`, `arm/patch-envelope` | `arm-resource-patch` checks that if a resource has `tags`, PATCH includes it. `patch-envelope` validates PATCH includes envelope properties (identity, managedBy, plan, sku, tags). |
| RPC008 | PUT, GET, PATCH & LIST must return the same resource schema | ✅ | `arm/arm-resource-operation-response` | Directly implements RPC 008 — validates that PUT, GET, PATCH, and LIST operations all return the same resource schema. |
| RPC009 | Use PUT for replace, PATCH for partial update (JSON merge-patch) | 🔧 | — | Enforced by ARM TypeSpec operation templates: `ResourceCreateOrUpdate` for PUT and `ResourceUpdate` for PATCH generate the correct patterns. |
| RPC010 | Use PUT or PATCH to update a resource, not POST | ❌ 📐 | — | No rule prevents using POST for what should be a resource update. `arm/arm-resource-invalid-action-verb` ensures actions use POST/GET verbs but does not check intent. **Service owners** must verify through API design review that POST is not used for operations that semantically update a resource. |
| RPC011.a | PUT on parent must not implicitly create tracked child resources | ❌ 📐 | — | No rule detects implicit child resource creation in PUT request bodies. **Service owners** must review PUT request schemas during API design review to ensure tracked child resources are not implicitly created. |
| RPC011.b | PUT on parent should avoid implicitly creating proxy child resources | ❌ 📐 | — | Same gap as RPC011.a. This rule is still being refined. **Service owners** should review PUT request schemas for implicit proxy child creation. |
| RPC012 | Secret property semantics (no secrets in GET/PUT/PATCH responses, use POST list* action) | 🔶 | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks properties with sensitive names (password, key, token, etc.) are marked `@secret`. **Service owners** must additionally verify that: (1) secrets are omitted from GET/PUT/PATCH responses, and (2) secret retrieval is only via POST `list*` actions. This can be validated through response payload inspection in integration tests. |
| RPC013 | Resource must define a property bag; should include provisioningState | ✅ | `arm/arm-resource-provisioning-state`, `arm/arm-resource-invalid-envelope-property` | `arm-resource-provisioning-state` checks for a properly configured `provisioningState`. `arm-resource-invalid-envelope-property` ensures RP-specific properties are inside the `properties` bag. ARM base types enforce the property bag structure. |
| RPC014 | POST action must operate on single resource | 🔶 | `arm/arm-resource-invalid-action-verb` | Validates that actions use POST or GET verbs. **Service owners** must verify through API design review that POST actions target individual resource instances, not collections. |
| RPC015 | PUT APIs that only return 200 (should also support 201/202 for creation) | ✅ | [`arm/arm-put-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/put-operation-response-codes) | Validates that PUT operations have the appropriate status codes including 201 for creation. |
| RPC016 | Responses must include id, name, type; RP content inside properties | ✅ | `arm/arm-resource-invalid-envelope-property`, `arm/arm-resource-operation-response` | `arm-resource-invalid-envelope-property` validates envelope properties come from Azure.ResourceManager namespace. ARM base types enforce id, name, type. `arm-resource-operation-response` ensures consistent schema across operations. |
| RPC019 | No resources of other types in response (RBAC violation / info leak) | ❌ 📐 | — | No rule detects when a response includes full content of resources of different types. **Service owners** must review response schemas during API design review to ensure responses do not embed full representations of other resource types, which could create RBAC bypass or information leakage. Related to ARG001. |
| RPC020 | Circular dependencies between resources (read-only back-references) | ❌ 📐 | — | No rule detects writable circular references between resources. **Service owners** must review resource relationships during API design review to ensure circular dependencies use `readOnly` back-references, so ARM template dependency ordering can be resolved. |
| RPC021 | operationResults must be a top-level resource type | ❌ 🏗️ | — | `/operationResults` API placement is an ARM platform pattern, not described in TypeSpec resource provider specs. **Service owners** must configure this through the ARM platform. |
| RPC022 | Identifiers for operationResults must be unique (use GUIDs, not hashes) | ❌ 🏗️ | — | Identifier generation strategy is a runtime implementation concern internal to ARM. **Service owners** must ensure their implementation uses GUIDs for operation result identifiers. |
| RPC023 | DELETE should always be honored (never reject DELETE on bad state) | ❌ 🔄 | — | Whether DELETE is accepted regardless of resource state is a runtime implementation concern. **Service owners** must verify through runtime tests that DELETE is never rejected due to resource state. |
| RPC024 | Prefer header-based async timeout over manifest-based | ❌ 🏗️ | — | Async timeout configuration is in the ARM manifest, not in the TypeSpec API specification. **Service owners** must configure this in the ARM manifest. |
| RPC025 | 201 is the recommended async pattern (201 + provisioningState + Azure-AsyncOperation) | 🔶 | [`arm/arm-put-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/put-operation-response-codes), [`arm/lro-location-header`](/docs/libraries/azure-resource-manager/rules/lro-location-header), `arm/retry-after` | PUT response codes, LRO Location header, and Retry-After are checked. **Service owners** should verify through integration tests that their preferred async pattern follows the 201 + provisioningState + Azure-AsyncOperation recommendation, as no rule specifically enforces this preference over alternatives. |
| RPC026 | Resource provider must implement subscription lifecycle contract | ❌ 🏗️ | — | Subscription lifecycle (register/unregister) is an internal ARM contract, not part of the customer-facing TypeSpec spec. POST `/register` in operations API is covered by `arm/missing-operations-endpoint`. **Service owners** must implement the subscription lifecycle contract as specified by the ARM platform. |
| RPC027 | SystemData support (createdBy, createdAt, etc.) | 🔧 | — | Enforced by ARM TypeSpec base types — `TrackedResource` and `ProxyResource` automatically include `systemData` in the resource model. |
| RPC028 | Async operation tracking URI must follow ARM guidelines | 🔶 | [`arm/lro-location-header`](/docs/libraries/azure-resource-manager/rules/lro-location-header) | Validates 202 responses include a Location header. **Service owners** must verify through integration tests that the Location URI format follows ARM guidelines and points to the ARM front door, as the specific URI format is not validated. |
| RPC029 | FQDNs must use auto-generated domain name labels (prevent subdomain takeover) | ❌ 🔄 | — | Domain label generation strategy is a runtime implementation concern. **Service owners** must verify through runtime testing that FQDNs use the AzureDNS Deterministic Names library to prevent subdomain takeover. |
| RPC030 | Avoid excessive resource type nesting (max 3 levels for tracked) | ✅ | `arm/beyond-nesting-levels` | Ensures tracked resources use 3 or fewer levels of nesting. |
| RPC031 | Unsupported query parameters (sub, subId, subscription, subscriptionId) | ❌ 🏗️ | — | ARM proxy behavior for query parameters is handled by the ARM platform. **Service owners** do not need to take action — this is enforced by the ARM front door. |

### RPC Rules Coverage Summary

| Coverage Level | Count | Rules |
| -------------- | ----- | ----- |
| ✅ Fully covered or enforced by templates | 12 | RPC004, RPC007, RPC008, RPC009, RPC013, RPC015, RPC016, RPC027, RPC030 (linting); RPC004, RPC009, RPC027 (templates) |
| 🔶 Partially covered | 6 | RPC005 (🔄 runtime gap), RPC006 (actionable gap), RPC012, RPC014, RPC025, RPC028 |
| ❌ 🏗️ Not lintable — internal ARM infrastructure | 6 | RPC003, RPC021, RPC022, RPC024, RPC026, RPC031 |
| ❌ 🔄 Not lintable — service runtime behavior | 2 | RPC023, RPC029 |
| ❌ 📐 Not lintable — design guidance | 5 | RPC010, RPC011.a, RPC011.b, RPC019, RPC020 |

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
| 2.2 Tracked resources must have all required operations      | RPC-Get-V1-01, RPC-Put-V1-01, RPC-Patch-V1-03, RPC-Delete-V1-01 | 🔶       | `arm/arm-resource-operation`, [`arm/no-resource-delete-operation`](/docs/libraries/azure-resource-manager/rules/no-resource-delete-operation)              | `arm-resource-operation` validates operations have correct decorators. `no-resource-delete-operation` checks that resources with createOrUpdate also have delete. **Gap**: No single rule validates the complete operation set (GET, PUT, PATCH, DELETE, ListByRG, ListBySub) for tracked resources — a linting rule could and should be added. **Service owners** should verify the complete operation set through API design review until such a rule exists. |
| 2.3 Nested resources must have List under parent             | —                                                               | ❌       | —                                                                                                                                                          | **Gap**: No rule validates that nested resources define a List operation under their parent — a linting rule could and should be added. **Service owners** must verify this during API design review until such a rule exists.                                                                              |
| 2.3 Nesting depth limit                                      | —                                                               | ✅       | `arm/beyond-nesting-levels`                                                                                                                                | Ensures tracked resources use 3 or fewer nesting levels.                                                                                                                                                                                                                                                  |
| 2.3 No embedded nested resources in parent GET               | ARG001                                                          | ❌ 📐    | —                                                                                                                                                          | No rule prevents embedding child resources inline in parent GET response. **Service owners** must verify during API design review that parent GET responses do not embed full child resources. See also Section 10.1.                                                                                      |
| 2.4 Resource references use fully qualified ARM resource IDs | —                                                               | 🔧 📐   | —                                                                                                                                                          | TypeSpec provides the `armResourceIdentifier` scalar in `Azure.Core` for this purpose, which enforces the `arm-id` format and allows specifying allowed resource types and scopes. However, no linting rule can reliably detect that a plain `string` property is *intended* to hold a resource reference — that requires domain knowledge. **Service owners** must use `armResourceIdentifier` for properties that reference other ARM resources and verify this through API design review. See [ARM Resource Types](./resource-type.md). |

## Section 3: PUT Operation Rules

| RPC Guideline                               | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                              | Notes                                                                                                                                                                                                                                   |
| ------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Resources must expose PUT for creation  | —         | 🔧       | —                                                                             | Enforced by ARM TypeSpec operation templates (`ResourceCreateOrUpdate`).                                                                                                                                                                |
| 3.1 PUT must be idempotent                  | —         | ❌ 🔄    | —                                                                             | Service runtime behavior — cannot be validated through API specification. **Service owners** must verify PUT idempotency through integration tests that repeat PUT requests and confirm no side effects.                                |
| 3.2 PUT must not expose secrets in response | —         | 🔶       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks that properties with sensitive names are marked `@secret`. **Service owners** must additionally verify that secrets are omitted from PUT responses through response payload inspection in integration tests.                      |

## Section 4: PATCH Operation Rules

| RPC Guideline                                    | RPC ID(s)       | Coverage | TypeSpec Rule(s)                                                              | Notes                                                                                                                                                    |
| ------------------------------------------------ | --------------- | -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 PATCH body must not have required properties | RPC-Patch-V1-10 | ✅       | `arm/arm-resource-patch`                                                      | Validates PATCH request body model properties. ARM TypeSpec templates automatically generate separate update models.                                     |
| 4.2 Tracked resource PATCH must support tags     | RPC-Patch-V1-03 | ✅       | `arm/arm-resource-patch`, `arm/patch-envelope`                                | `arm-resource-patch` checks tags are included. `patch-envelope` validates envelope properties (identity, managedBy, plan, sku, tags) match the resource. |
| 4.2 Resources should have updateable properties  | —               | ✅       | `arm/empty-updateable-properties`                                             | Checks that resources with update operations have at least one updateable property.                                                                      |
| 4.3 PATCH must not expose secrets in response    | —               | 🔶       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks sensitive property names are marked `@secret`. **Service owners** must additionally verify that secrets are omitted from PATCH responses through response payload inspection in integration tests.  |

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
| 6.2 Operation results as root-level resources                    | —            | ❌ 🏗️    | —                                                                                             | Internal ARM infrastructure concern — `/operationResults` placement is an ARM platform pattern, not described in TypeSpec specs. **Service owners** must configure this through the ARM platform. |

## Section 7: Secret Handling & Sensitive Data

| RPC Guideline                                | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                              | Notes                                                                                                                                                                                                       |
| -------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 No secrets in GET/PUT/PATCH responses    | —         | 🔶       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Validates that properties with sensitive names are marked `@secret`. The `@secret` decorator drives correct code generation, but the rule does not verify secrets are omitted from specific response types. **Service owners** must verify through integration tests that secrets are excluded from GET/PUT/PATCH responses. |
| 7.1 Secret retrieval via POST `list*` action | —         | ❌ 📐    | —                                                                             | No rule validates that secrets are exposed only via POST `list*` actions for granular RBAC control. **Service owners** must verify this design pattern through API design review.                            |
| 7.2 `x-ms-secret` annotation                 | RPC-v1-13 | ✅       | [`arm/secret-prop`](/docs/libraries/azure-resource-manager/rules/secret-prop) | Checks that sensitive properties are annotated with `@secret`, which generates `x-ms-secret: true`.                                                                                                         |

## Section 8: Property Design Best Practices

| RPC Guideline                                            | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                           | Notes                                                                                                                                                                   |
| -------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 Prefer enums over booleans                           | —         | ❌ 📐    | —                                                                                          | Design guidance requiring human judgment. Booleans are sometimes appropriate. **Service owners** must evaluate during API design review.                                |
| 8.2 Use objects instead of strings for structured values | —         | ❌ 📐    | —                                                                                          | Design guidance requiring human judgment. **Service owners** must evaluate during API design review.                                                                    |
| 8.3 Use enums for finite value sets                      | —         | 🔶       | [`core/no-enum`](/docs/libraries/azure-core/rules/no-enum)                                 | Azure Core recommends extensible unions over enums, which aligns with ARM's preference for extensible types. **Service owners** should verify that free-form strings that should be constrained are modeled as extensible unions. |
| 8.4 Visibility and mutability                            | —         | 🔶       | [`core/key-visibility-required`](/docs/libraries/azure-core/rules/key-visibility-required) | Checks key properties have visibility settings. **Service owners** must verify that create-only, read-only, and other mutability constraints are properly annotated on all properties through API design review. |
| 8.5 Avoid writable circular dependencies                 | —         | ❌ 📐    | —                                                                                          | No rule detects writable circular references between resources. **Service owners** must review resource dependency graphs during API design review to ensure circular dependencies use `readOnly` back-references for correct ARM template dependency ordering. |

## Section 9: Inline Properties vs. Nested Resources

| RPC Guideline                                   | RPC ID(s) | Coverage | TypeSpec Rule(s) | Notes                                                                                                                                                                                                                     |
| ----------------------------------------------- | --------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1–9.2 When to use inline vs. nested resources | —         | ❌ 📐    | —                | Design guidance requiring human judgment based on lifecycle, RBAC, and collection size. **Service owners** must make this decision during API design review.                                                              |
| 9.3 Never model both inline and nested          | —         | ❌ 📐    | —                | No rule detects when a collection is modeled as both an inline array property and a nested resource type. **Service owners** must verify during API design review that each entity is modeled exclusively as either inline or nested. |

## Section 10: Azure Resource Graph (ARG) Compatibility

| RPC Guideline                                               | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                           | Notes                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1 No embedded child resources in parent GET (ARG001)     | ARG001    | ❌ 📐    | —                                                                                          | No rule prevents embedding child resources or child counts in parent resource GET responses. **Service owners** must verify during API design review that parent GET responses do not include full child resource representations. |
| 10.2 No customer data in control plane properties (ARG002)  | ARG002    | ❌ 🔄    | —                                                                                          | Data classification concern — cannot be reliably detected through API specification linting. **Service owners** must verify through data classification review that control plane properties do not contain customer data.         |
| 10.3 Do not remove properties between API versions (ARG003) | ARG003    | 🔶       | [`core/non-breaking-versioning`](/docs/libraries/azure-core/rules/non-breaking-versioning) | Checks for backward compatible versioning changes. **Service owners** should additionally verify through API version comparison testing that no properties are removed between versions, as the rule may not catch all scenarios.   |

## Section 11: API Version Practices

| RPC Guideline                            | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                                                                     | Notes                                                                                                                |
| ---------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 11.1 Uniform versioning within a service | —         | 🔧       | —                                                                                                                                    | Enforced by TypeSpec versioning model — all resource types in a namespace share the same version enum.               |
| 11.2 Incremental version progression     | —         | ❌       | —                                                                                                                                    | **Gap**: GA versions must have a later date than preview. Since versions are represented as an enum type in TypeSpec, a linting rule could detect incorrect versioning patterns. **Service owners** must verify version progression through their release process and CI/CD pipeline checks until such a rule exists. |
| API version parameter required           | —         | ✅       | [`core/operation-missing-api-version`](/docs/libraries/azure-core/rules/operation-missing-api-version), `arm/arm-resource-operation` | Both rules validate operations include an api-version parameter.                                                     |
| Version format validation                | —         | ✅       | `arm/arm-resource-invalid-version-format`                                                                                            | Checks that version strings use valid ARM version formats.                                                           |

## Section 12: POST Actions

| RPC Guideline                                | RPC ID(s) | Coverage | TypeSpec Rule(s)                                                                                                        | Notes                                                                                                    |
| -------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 12.1 POST actions must use POST or GET verbs | —         | ✅       | [`arm/arm-resource-invalid-action-verb`](/docs/libraries/azure-resource-manager/rules/arm-resource-invalid-action-verb) | Validates that action operations use only POST or GET HTTP verbs.                                        |
| 12.1 POST response codes                     | —         | ✅       | [`arm/arm-post-operation-response-codes`](/docs/libraries/azure-resource-manager/rules/post-operation-response-codes)   | Validates correct status codes for POST operations.                                                      |
| 12.2 POST to create resources               | —         | ❌ 📐    | —                                                                                                                       | POST creation is not allowed for ARM services. This constraint is not detectable by examining the API description alone. **Service owners** must verify through API design review that POST is not used for resource creation in ARM resource provider APIs. |

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

## Rules Not Enforceable Through Linting — Service Owner Responsibility

The following RPC rules cannot be validated through API specification linting. **Service owners are responsible for verifying compliance** through the mechanisms described below.

### ❌ 🏗️ Internal ARM Infrastructure

These rules describe internal ARM platform concerns that are configured through the ARM manifest or other ARM platform mechanisms, not through the TypeSpec API specification.

| RPC Rule | Description | How to Verify |
| -------- | ----------- | ------------- |
| RPC003 | Tracked resource types must support move | Configure resource move support in the ARM manifest. |
| RPC021 | operationResults must be a top-level resource type | Configure through the ARM platform. |
| RPC022 | Identifiers for operationResults must be unique (use GUIDs) | Verify in service implementation that operation result identifiers use GUIDs. |
| RPC024 | Prefer header-based async timeout over manifest-based | Configure in the ARM manifest. |
| RPC026 | Resource provider must implement subscription lifecycle contract | Implement the subscription lifecycle contract as specified by the ARM platform. |
| RPC031 | Unsupported query parameters | Enforced by the ARM front door — no service action required. |

### ❌ 🔄 Service Runtime Behavior

These rules describe runtime behavior that can only be validated through testing, not through API specification.

| RPC Rule | Description | How to Verify |
| -------- | ----------- | ------------- |
| RPC005 (runtime aspects) | Provisioning state transitions on PUT/PATCH/DELETE | Integration tests covering resource lifecycle (create, update, delete) and validating terminal states (Succeeded, Failed, Canceled). |
| RPC023 | DELETE should always be honored (never reject on bad state) | Runtime tests confirming DELETE is accepted regardless of resource state. |
| RPC029 | FQDNs must use auto-generated domain name labels | Runtime tests verifying FQDNs use the AzureDNS Deterministic Names library to prevent subdomain takeover. |
| 3.1 | PUT must be idempotent | Integration tests repeating PUT requests and confirming no side effects. |
| 10.2 (ARG002) | No customer data in control plane properties | Data classification review of control plane properties. |

### ❌ 📐 Design Guidance Requiring Human Judgment

These rules require domain knowledge or design judgment that automated linting cannot provide. **Service owners must verify compliance through API design reviews.**

| RPC Rule | Description | What to Look For in Design Review |
| -------- | ----------- | --------------------------------- |
| RPC010 | Use PUT or PATCH to update a resource, not POST | Verify POST is not used for operations that semantically update a resource. |
| RPC011.a | PUT on parent must not implicitly create tracked child resources | Review PUT request schemas for properties that would create child resources as a side effect. |
| RPC011.b | PUT on parent should avoid implicitly creating proxy child resources | Same as RPC011.a for proxy child resources. |
| RPC019 | No resources of other types in response (RBAC/info leak) | Review response schemas to ensure they do not embed full representations of other resource types. |
| RPC020 | Circular dependencies between resources | Review resource dependency graphs to ensure circular dependencies use `readOnly` back-references. |
| 2.3 | No embedded nested resources in parent GET | Verify parent GET responses do not embed full child resource representations. |
| 2.4 | Resource references use fully qualified ARM resource IDs | Verify all properties referencing other ARM resources use the `armResourceIdentifier` scalar. |
| 7.1 | Secret retrieval via POST `list*` action only | Verify secrets are exposed only via POST `list*` actions for granular RBAC control. |
| 8.1 | Prefer enums over booleans | Evaluate whether booleans should be replaced with extensible enums. |
| 8.2 | Use objects instead of strings for structured values | Evaluate whether string properties contain structured data that should be modeled as objects. |
| 9.1–9.2 | When to use inline vs. nested resources | Evaluate lifecycle, RBAC, and collection size to choose between inline properties and nested resources. |
| 9.3 | Never model both inline and nested | Verify each entity is modeled exclusively as either inline or nested. |
| 10.1 (ARG001) | No embedded child resources in parent GET | Verify parent GET responses do not include full child resource representations. |
| 12.2 | POST to create resources | POST creation is not allowed for ARM services. Verify POST is not used for resource creation in ARM APIs. Not detectable from API description alone. |

## Partially Covered Rules — Service Owner Verification Required

The following rules are partially covered by TypeSpec linting, but **service owners must verify the uncovered aspects** as described below.

| RPC Rule | What Linting Covers | What Service Owners Must Verify |
| -------- | ------------------- | ------------------------------- |
| RPC005 🔄 | `arm-resource-provisioning-state` checks that `provisioningState` is an open union containing the correct terminal states (Succeeded, Failed, Canceled). | Correct provisioning state transitions during resource lifecycle (create, update, delete). Verify through integration tests. |
| RPC006 | `arm-resource-operation` validates operation decorators. `no-resource-delete-operation` checks delete exists with createOrUpdate. | The complete operation set (GET, PUT, PATCH, DELETE, ListByRG, ListBySub) — this is an actionable gap where a linting rule could be added. Verify through API design review until then. |
| RPC012 | `secret-prop` checks sensitive property names are marked `@secret`. | (1) Secrets are omitted from GET/PUT/PATCH responses, (2) secret retrieval is only via POST `list*` actions. Verify through integration tests inspecting response payloads. |
| RPC014 | `arm-resource-invalid-action-verb` validates POST/GET verb usage. | POST actions target individual resource instances, not collections. Verify through API design review. |
| RPC025 | PUT response codes, LRO Location header, and Retry-After are validated. | The preferred async pattern (201 + provisioningState + Azure-AsyncOperation) is followed. Verify through integration tests. |
| RPC028 | LRO Location header presence is validated for 202 responses. | The Location URI format follows ARM guidelines and points to the ARM front door. Verify through integration tests. |
| 7.1 | `secret-prop` validates sensitive property annotations. | Secrets are excluded from GET/PUT/PATCH response payloads. Verify through integration tests. |
| 8.3 | `no-enum` recommends extensible unions over fixed enums. | Free-form strings that should be constrained are modeled as extensible unions. Verify through API design review. |
| 8.4 | `key-visibility-required` checks key property visibility. | Create-only, read-only, and other mutability constraints are properly annotated on all properties. Verify through API design review. |
| 10.3 (ARG003) | `non-breaking-versioning` checks backward compatible versioning. | No properties are removed between API versions. Verify through API version comparison testing. |

## Actionable Gaps — Where Future Linting Rules Could Help

The following areas are customer-facing API concerns where new TypeSpec linting rules could potentially be added to improve automated coverage. Until such rules are implemented, **service owners must verify these through API design reviews**.

| Area | RPC Rule(s) | Gap Description | Potential Linting Approach |
| ---- | ----------- | --------------- | -------------------------- |
| Complete operation set | RPC006, 2.2 | No single rule validates that tracked resources have all required operations (GET, PUT, PATCH, DELETE, ListByRG, ListBySub). | A rule could check each tracked resource type against the required operation set and report missing operations. |
| Nested resource List | 2.3 | No rule validates that nested/child resources define a List operation scoped to their parent. | A rule could verify each child resource has a List operation at the parent scope. |
| Version progression | 11.2 | No rule validates that GA versions have a later date than preview versions. | Since versions are represented as an enum type in TypeSpec, a rule could check that GA version date strings are chronologically later than their corresponding preview versions. |
| Implicit child creation | RPC011.a, RPC011.b | No rule detects implicit child resource creation in PUT request bodies. | A rule could flag PUT request schemas that contain arrays or properties matching known child resource type shapes. |
| POST vs. PUT/PATCH intent | RPC010 | No rule detects when POST is used for what should be a resource update. | Difficult to automate — would require heuristics on POST operation naming and body schemas. |
| Cross-resource type responses | RPC019 | No rule detects when a response embeds full content of other resource types. | A rule could flag response models containing properties typed as other ARM resource types. |
| Circular resource dependencies | RPC020 | No rule detects writable circular references between resource types. | A rule could build a resource dependency graph and flag cycles where all references are writable. |
