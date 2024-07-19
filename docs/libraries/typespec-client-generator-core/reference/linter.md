---
title: "Linter usage"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Linter

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

| Name                                                                 | Description                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `@azure-tools/typespec-client-generator-core/require-client-suffix`  | Client names should end with 'Client'.                                  |
| `@azure-tools/typespec-client-generator-core/property-name-conflict` | Avoid naming conflicts between a property and a model of the same name. |
