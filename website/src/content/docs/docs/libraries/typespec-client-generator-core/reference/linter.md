---
title: "Linter usage"
---

## Usage

Add the following in `tspconfig.yaml`:

```yaml
linter:
  extends:
    - "@azure-tools/typespec-client-generator-core/all"
```

## RuleSets

Available ruleSets:

- `@azure-tools/typespec-client-generator-core/all`
- `@azure-tools/typespec-client-generator-core/best-practices:csharp`

## Rules

| Name                                                                                                                                                                                      | Description                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`@azure-tools/typespec-client-generator-core/require-client-suffix`](/libraries/typespec-client-generator-core/rules/require-client-suffix.md)                                           | Client names should end with 'Client'.                                  |
| [`@azure-tools/typespec-client-generator-core/property-name-conflict`](/libraries/typespec-client-generator-core/rules/property-name-conflict.md)                                         | Avoid naming conflicts between a property and a model of the same name. |
| [`@azure-tools/typespec-client-generator-core/no-unnamed-types`](/libraries/typespec-client-generator-core/rules/no-unnamed-types.md)                                                     | Requires types to be named rather than defined anonymously or inline.   |
