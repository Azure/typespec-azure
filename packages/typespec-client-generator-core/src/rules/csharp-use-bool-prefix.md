Boolean property and operation parameter names should begin with a verb prefix and read affirmatively in C# SDKs. For verb-prefix guidance, see the [Azure SDK for .NET naming conventions](https://github.com/Azure/azure-sdk-for-net/blob/main/doc/dev/Mgmt-Naming-Conventions.md).

The rule checks the C# name resolved through `@clientName`, including unscoped overrides. It splits the identifier into words with `change-case` and uses `compromise` to check whether the first word is an English verb. At least one word must follow the verb. Both `isEnabled` and `IsEnabled` are accepted, as are names such as `SupportsHttps`, `AllowsDeletion`, and `ContainsSecrets`; the rule is not limited to a fixed prefix list. Names such as `island` are not accepted merely because they begin with the letters `is`.

Verb recognition analyzes the first word in isolation, not the meaning of the complete name. Ambiguous words and domain-specific vocabulary may be misclassified. A recognized verb does not guarantee that the name is a natural boolean predicate; review the name's meaning as well.

Optional booleans, boolean literals, scalars derived from `boolean`, and unions containing only boolean types and `null` are checked. Arrays and unions mixing booleans with other types are not checked.

Enable this rule through `@azure-tools/typespec-client-generator-core/best-practices:csharp` or `@azure-tools/typespec-azure-rulesets/client-sdk`. It is not enabled by the general data-plane or resource-manager rulesets.

#### ❌ Incorrect

```tsp
model Widget {
  enabled: boolean;
}

op listWidgets(detailed?: boolean): Widget[];
```

#### ✅ Correct

```tsp
model Widget {
  isEnabled: boolean;
}

op listWidgets(shouldIncludeDetails?: boolean): Widget[];
```

To preserve the original TypeSpec and wire names, override only the C# name in `client.tsp`:

```tsp
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(Widget.enabled, "IsEnabled", "csharp");
@@clientName(listWidgets::parameters.detailed, "IsDetailed", "csharp");
```

Warnings about missing verb prefixes provide naming guidance and four alternative quick fixes that prepend `Is`, `Has`, `Can`, or `Should` to the existing name with its first letter capitalized. Each quick fix writes a C#-scoped `@@clientName` override to `client.tsp`. These are mechanical candidates, not semantic recommendations: choose the prefix that matches the intended meaning, or write a more suitable name manually. For example, choose `IsEnabled` for `enabled`, but `HasChildren` for `children` rather than `IsChildren`. The rule does not select a prefix automatically. Ensure `client.tsp` is included in compilation, for example through the `imports` option in `tspconfig.yaml`.

## Affirmative naming

The rule separately checks for the independent words `not`, `no`, and `never`, ignoring case. Names such as `IsNotEnabled`, `HasNoChildren`, `ShouldNeverRetry`, and `IsNotDisabled` produce a warning even though they start with a verb. Names such as `IsNotable` and `HasNotifications` are not flagged just because they contain the letters `not` or `no`.

This check is intentionally conservative: it does not infer negation from prefixes such as `un` or `dis`, or attempt to interpret every name's meaning. For example, `IsDisabled` and `IsUnavailable` are not flagged by this check.

Negative names receive manual-review guidance, not the prefix quick fixes described above. If a name both lacks a verb prefix and contains an explicit negative word, the negative-name warning takes precedence so that quick fixes do not prepend a verb to an already negative name.

Prefer affirmative names such as `IsEnabled` where appropriate to the intended value semantics. Do not simply rename `IsNotEnabled` to `IsEnabled`: a `@clientName` override does not invert values, so such a rename would reverse how consumers interpret `true`. Review the contract and any required value transformation before changing the name. Preserve compatibility with already-shipped SDKs where necessary.

## Impact

- **Area:** SDK

Boolean names without a predicate prefix make the meaning of C# SDK properties and parameters less clear. A C#-scoped override preserves the wire contract and other languages, but renaming a member in an already-shipped C# SDK can be a breaking change.

## Suppression

Suppression is acceptable when preserving an existing public SDK name is necessary for compatibility. Otherwise, use a C#-scoped `@clientName` override or rename the TypeSpec property or parameter if the change is appropriate for every language.

```tsp
model Widget {
  #suppress "@azure-tools/typespec-client-generator-core/csharp-use-bool-prefix" "Preserve the shipped C# SDK property name."
  enabled: boolean;
}
```
