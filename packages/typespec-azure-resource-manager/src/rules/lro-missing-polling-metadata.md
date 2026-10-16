ARM PATCH and provider or collection POST operations returning `202 Accepted`
must describe how clients poll the operation and obtain its final result.
A plain HTTP `Location` header does not supply that polling metadata.

Use standard asynchronous ARM templates, and preserve their semantic LRO
headers when customizing responses. For example, retain
`ArmLroLocationHeader<FinalResult = Widget>` in a custom PATCH response.
Synchronous templates can also supply polling metadata through a customized
accepted response, but changing only the status code and header name is not
sufficient.

This rule checks PATCH and POST operations marked as ARM provider or collection
actions. It reports once on each operation with an explicit `202` response and
no native LRO metadata. Operations without `202` or with native polling metadata
are compliant. Registered resource-instance POST, PUT, and DELETE response
requirements are covered by the existing ARM response-code rules.

Operations reached through overlapping service declarations are checked once,
including compliant operations. This avoids repeating diagnostics from native
polling-metadata resolution.

The rule is available but disabled by default in the resource-manager ruleset.

## Impact

- **Area:** API, SDK

Missing polling metadata prevents Azure tooling and generated clients from
describing the operation's polling and final-result behavior. Clients may treat
the initial accepted response as the final result instead of waiting for
completion.

## ❌ Incorrect

Replacing the standard headers with a string-valued `Location` header preserves
the accepted response but removes its polling semantics:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model PlainLocationHeaders {
  ...Azure.Core.Foundations.RetryAfterHeader;
  @header("Location") location?: string;
}

@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = PlainLocationHeaders>;
}
```

## ✅ Correct

Keep the same asynchronous operation and accepted response, but restore the
supported polling and final-result metadata:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<
    Widget,
    Widget,
    LroHeaders = ArmLroLocationHeader<FinalResult = Widget> &
      Azure.Core.Foundations.RetryAfterHeader
  >;
}
```

Custom `ArmProviderActionAsync` headers have the same requirement. The default
asynchronous provider template already carries supported polling metadata.

## Suppression

Prefer restoring the semantic headers or using the standard asynchronous
template. Suppress only when an externally defined polling contract cannot yet
be represented using supported TypeSpec metadata. Document that contract and
why a temporary exception is necessary.

Place
`#suppress "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata" "<justification>"`
on the affected operation.

## LintDiff Equivalent

This rule originates from
[LroExtension](https://github.com/Azure/azure-openapi-validator/blob/main/docs/lro-extension.md).

The native implementation follows the reviewed
[lintdiff source rule](https://github.com/Azure/typespec-azure/blob/feature/lintdiff-lro-extension/packages/typespec-lintdiff/src/rules/lro-extension.ts)
at `9afb5818fba089835296258049ad7104e8a92c50`, refreshed from
`f0973f43bffa73169fdde0436566c2534bdab595` to visit eligible operations before
resolving polling metadata. The official ARM rule preserves the destination's
providerless applicability adaptation and remains disabled by default.
