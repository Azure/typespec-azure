ARM operations indicating asynchronous processing must describe how clients
poll the operation and obtain its final result. This rule combines two checks:

| Trigger                                                | Scope                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| An explicit `202 Accepted` response                    | All PATCH operations, and POST operations marked as ARM provider or collection actions, even without a polling header |
| A `Location` or `Azure-AsyncOperation` response header | PUT, PATCH, POST, and DELETE operations with an explicit `200`, `201`, `202`, or `204` response                       |

Header names are case-insensitive. A plain polling URL or an output-only
`x-ms-long-running-operation: true` extension does not supply native polling
metadata. GET operations, including polling GETs, are outside both checks.

Use standard asynchronous ARM templates, and preserve their semantic LRO
headers when customizing responses. For example, retain
`ArmLroLocationHeader<FinalResult = Widget>` in a custom PATCH response.
Synchronous templates can also supply polling metadata through a customized
accepted response, but changing only the status code and header name is not
sufficient.

The rule checks HTTP operations in service namespaces, without requiring
provider-namespace metadata. Either trigger requires native LRO metadata.
Operations matching both triggers receive only one warning, on the authored
operation rather than a shared response header. Native polling metadata satisfies
both checks. Broad status-code ranges do not substitute for the explicit numeric
statuses above.

Registered resource-instance POST, PUT, and DELETE operations remain subject to
the polling-header check. Existing ARM response-code and Location-header rules
retain ownership of their separate status-code and header-presence requirements.

Each concrete operation within an explicitly declared service is checked once,
including operations in nested namespaces and overlapping services. Operations
outside explicit services are not checked. This avoids repeating diagnostics
from native polling-metadata resolution.

The combined rule retains one disabled (`false`) entry in the central Azure
resource-manager ruleset. The ARM library's compiler-generated `all` ruleset
includes registered rules, including this one. Consolidation adds no second
public rule or registration; selecting this rule selects both checks.

## Impact

- **Area:** API, SDK

Missing polling metadata prevents Azure tooling and generated clients from
describing the operation's polling and final-result behavior. Clients may treat
the initial accepted response as the final result instead of waiting for
completion.

## ❌ Incorrect

Replacing the standard headers with a string-valued `Location` header preserves
the accepted response but removes its polling semantics. These excerpts assume
the `Widget` resource model is already defined:

```tsp
model PlainLocationHeaders {
  ...Azure.Core.Foundations.RetryAfterHeader;
  @header("Location") location?: string;
}

op update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = PlainLocationHeaders>;
```

## ✅ Correct

Keep the same asynchronous operation and accepted response, but restore the
supported polling and final-result metadata:

```tsp
op update is ArmCustomPatchAsync<
  Widget,
  Widget,
  LroHeaders = ArmLroLocationHeader<FinalResult = Widget> & Azure.Core.Foundations.RetryAfterHeader
>;
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

| Swagger validator                                                                                                                         | Combined native coverage                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [LroExtension](https://github.com/Azure/azure-openapi-validator/blob/main/docs/lro-extension.md)                                          | Require polling metadata for PATCH and marked provider/collection POST operations returning `202`; this is partial native coverage of the broader Swagger selector. |
| [XMSLongRunningOperationProperty](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-long-running-operation-property.md) | Require polling metadata for PUT/PATCH/POST/DELETE responses with qualifying polling headers and status codes.                                                      |

The reviewed lintdiff sources remain unchanged:
[LroExtension at `9afb5818`](https://github.com/Azure/typespec-azure/blob/9afb5818fba089835296258049ad7104e8a92c50/packages/typespec-lintdiff/src/rules/lro-extension.ts)
and
[XMSLongRunningOperationProperty at `2f7e1d5c`](https://github.com/Azure/typespec-azure/blob/2f7e1d5c3d04230666f7524235bd25eff364eaa8/packages/typespec-lintdiff/src/rules/xms-long-running-operation-property.ts).
Their official destination policies are consolidated here, preserving removal
of the mixed-runner provider-namespace isolation guards.

The native rule requires supported polling semantics instead of accepting an
emitted extension alone. It checks the supplied program rather than historical
Swagger projections and reports once per authored operation. It does not claim
identical emitted diagnostic counts.
