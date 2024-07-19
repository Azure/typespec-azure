# Contributing Linter Rules to the @azure-tools/typespec-client-generator-core Package

For information about linter rules in typespec in general, view [here][generic-linter]

In the `@azure-tools/typespec-client-generator-core` library, we have two main types of rules:

1. Generic rule that applies to all emitted languages
2. Specific rule that applies to a subset of all language: it can even apply to just one language

The process for adding a rule starts off the same for both: for language-specific rules, there is an extra step

1. Write the rule in `typespec-azure/packages/typespec-client-generator-core/src/rules/[rule-name].rule.ts
2. Add reference to the rule in the `rules` array in [`typespec-azure/packages/typespec-client-generator-core/src/linter.ts`][tcgc-linter]
    - This will automatically add it to a ruleset called `:all` for `@azure-tools/typespec-client-generator-core`
3. Add the rule to the enable list for [`data-plane.ts`][data-plane-ruleset] and/or [`resource-manager.ts`][resource-manager-ruleset] in the [rulesets][rulesets] package. You can set `enable` to `false` here, if you want to delay enabling

**If you are adding a language-specific rule**, you will also need this extra step
4. Add reference to the rule in the `[language]Rules` array in [`typespec-azure/packages/typespec-client-generator-core/src/linter.ts`][tcgc-linter]

For Azure generations then, all rules, including all language-specific rules, will be run on the specs.
For unbranded generations, since we've added the rules into specific `best-practices:[language]` rulesets, you can explicitly specify a subset of rules in your `tsp-config.yaml`, i.e. if I only want Python best-practices, I could add this in my `tsp-config.yaml`:

```yaml
linter:
  extends:
    - best-practices: python
```


Finally, we recommend that every warning or error you throw in your language emitter has a corresponding warning in TCGC. This is part of our shift-left policy, so tsp authors can catch these potential pitfalls earlier in the process.

### Links

[generic-linter]: https://typespec.io/docs/next/extending-typespec/linters "Generic Linter Docs"
[tcgc-linter]: https://github.com/typespec-azure/packages/typespec-client-generator-core/src/linter.ts "Linter TS File"
[rulesets]: https://github.com/typespec-azure/packages/typespec-azure-rulesets "Rulesets package"
[data-plane-ruleset]: https://github.com/typespec-azure/packages/typespec-azure-rulesets/src/rulesets/data-plane.ts "Data Plane Ruleset"
[resource-manager-ruleset]: https://github.com/typespec-azure/packages/typespec-azure-rulesets/src/rulesets/resource-manager.ts "Resource Manager Ruleset"
