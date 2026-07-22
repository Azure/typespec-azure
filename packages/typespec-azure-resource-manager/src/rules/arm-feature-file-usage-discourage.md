Avoid using the `@featureFiles` decorator. Its usage should be limited to brownfield services migration and requires explicit approval.

#### ❌ Incorrect

```tsp
@armProviderNamespace
@Azure.ResourceManager.featureFiles(Features)
namespace Microsoft.Contoso;

enum Features {
  FeatureA: "Feature A",
}
```

#### ✅ Correct

Do not use the `@featureFiles` decorator unless you have explicit approval for brownfield migration:

```tsp
#suppress "@azure-tools/typespec-azure-resource-manager/arm-feature-file-usage-discourage" "Approved for brownfield migration."
@armProviderNamespace
@Azure.ResourceManager.featureFiles(Features)
namespace Microsoft.Contoso;

enum Features {
  FeatureA: "Feature A",
}
```
