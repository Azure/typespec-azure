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

| Name                                                                                                                   | Description                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`@azure-tools/typespec-client-generator-core/require-client-suffix`](../rules/require-client-suffix.md)               | Client names should end with 'Client'.                                                                   |
| [`@azure-tools/typespec-client-generator-core/property-name-conflict`](../rules/property-name-conflict.md)             | Avoid naming conflicts between a property and a model of the same name.                                  |
| [`@azure-tools/typespec-client-generator-core/no-unnamed-types`](../rules/no-unnamed-types.md)                         | Requires types to be named rather than defined anonymously or inline.                                    |
| [`@azure-tools/typespec-client-generator-core/csharp-no-url-suffix`](../rules/csharp-no-url-suffix.md)                 | Properties ending with 'Url' should use 'Uri' suffix instead to follow .NET naming conventions.          |
| [`@azure-tools/typespec-client-generator-core/csharp-no-options-suffix`](../rules/csharp-no-options-suffix.md)         | Model names ending with 'Options' should use 'Config' suffix instead for C# SDKs, except client options. |
| [`@azure-tools/typespec-client-generator-core/csharp-no-request-suffix`](../rules/csharp-no-request-suffix.md)         | Model names ending with 'Request' should use 'Content' suffix instead for C# SDKs.                       |
| [`@azure-tools/typespec-client-generator-core/csharp-no-response-suffix`](../rules/csharp-no-response-suffix.md)       | Model names ending with 'Response' should use 'Result' suffix instead for C# SDKs.                       |
| [`@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms`](../rules/csharp-use-standard-acronyms.md) | C# SDK names should use standard acronym casing.                                                         |
