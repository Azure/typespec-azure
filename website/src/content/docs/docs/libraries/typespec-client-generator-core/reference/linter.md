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

| Name                                                                                                                   | Description                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`@azure-tools/typespec-client-generator-core/require-client-suffix`](../rules/require-client-suffix.md)               | Client names should end with 'Client'.                                                          |
| [`@azure-tools/typespec-client-generator-core/property-name-conflict`](../rules/property-name-conflict.md)             | Avoid naming conflicts between a property and a model of the same name.                         |
| [`@azure-tools/typespec-client-generator-core/csharp-no-url-suffix`](../rules/csharp-no-url-suffix.md)                 | Properties ending with 'Url' should use 'Uri' suffix instead to follow .NET naming conventions. |
| [`@azure-tools/typespec-client-generator-core/csharp-model-suffix`](../rules/csharp-model-suffix.md)                   | Model names should use recommended suffixes for C# SDKs.                                        |
| [`@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms`](../rules/csharp-use-standard-acronyms.md) | C# SDK names should use standard acronym casing.                                                |
