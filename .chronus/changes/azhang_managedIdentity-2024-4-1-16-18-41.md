---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Standardizing mix-in model names with consistent `Property` suffix.

- Deprecate `ManagedServiceIdentity`. `ManagedServiceIdentityProperty` should be used instead.

  Example:
  ```diff
  -...ManagedServiceIdentity;
  +...ManagedServiceIdentityProperty;
  ```

- Deprecate `ManagedSystemAssignedIdentity`. `ManagedSystemAssignedIdentityProperty` should be used instead.

  Example:
  ```diff
  -...ManagedSystemAssignedIdentity;
  +...ManagedSystemAssignedIdentityProperty;
  ```

- Deprecate `EntityTag`. `EntityTagProperty` should be used instead.

  Example:
  ```diff
  -...EntityTag;
  +...EntityTagProperty;
  ```

- Deprecate `ResourceKind`. `ResourceKindProperty` should be used instead.

  Example:
  ```diff
  -...ResourceKind;
  +...ResourceKindProperty;
  ```

- Deprecate `ResourcePlan`. `ResourcePlanProperty` should be used instead.

  Example:
  ```diff
  -...ResourcePlan;
  +...ResourcePlanProperty;
  ```

- Deprecate `ResourceSku`. `ResourceSkuProperty` should be used instead.

  Example:
  ```diff
  -...ResourceSku;
  +...ResourceSkuProperty;
  ```

- Deprecate `ManagedBy`. `ManagedByProperty` should be used instead.

  Example:
  ```diff
  -...ManagedBy;
  +...ManagedByProperty;
  ```

