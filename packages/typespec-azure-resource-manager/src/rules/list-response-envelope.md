ARM HTTP 200 list responses must use a predictable body envelope containing exactly an array-valued `value` and `nextLink`. A paged operation's next-link property must belong to the selected response body, not just its HTTP headers or properties excluded by `@bodyIgnore`.

## Impact

- **Area:** API, SDK

Nonstandard collection envelopes and next links absent from the response body can prevent clients from retrieving subsequent pages.

The rule checks ARM-provider collection GET paths and authored `@list` operations with a paging `@nextLink`, including POST list actions and operations without provider metadata. Inherited body properties are included.

- HTTP 200 body envelopes must contain exactly `value` and `nextLink`, with an array-valued `value`. Custom next-link names and additional body properties are rejected. HTTP headers do not count as body properties.
- For paged operations, the response selected for next-link correspondence is HTTP 200 if declared; otherwise, the lowest declared numeric 2xx status; otherwise, a success status range; otherwise, the default response. Source union ordering does not change numeric status selection.
- If the selected response has a body, it must contain an eligible property serialized with the semantic `@nextLink` property's name in each declared response media type. A property renamed by `@encodedName` does not satisfy this requirement unless another eligible body property supplies the expected serialized name. Fallback responses are checked only for that correspondence: custom item and next-link names and additional properties are allowed.
- A selected response without a body is skipped, rather than falling through to another response. This rule does not independently require a body or HTTP 200 response.
- An explicit `@body` preserves its properties even when they have HTTP metadata annotations. `@bodyRoot` still treats headers as HTTP metadata. No additional next-link type or lifecycle-visibility requirement is introduced.

Prefer standard ARM list operation templates, which provide the standard envelope. When customizing their response, keep the next link in the body.

## ❌ Incorrect

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Contoso.Widgets;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model PageMetadata {
  @header
  @nextLink
  nextLink?: string;
}

model WidgetPage extends PageMetadata {
  @pageItems value: Widget[];
}

@armResourceOperations
interface Widgets {
  listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetPage>>;
}
```

## ✅ Correct

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Contoso.Widgets;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model PageMetadata {
  @nextLink
  nextLink?: string;
}

model WidgetPage extends PageMetadata {
  @pageItems value: Widget[];
}

@armResourceOperations
interface Widgets {
  listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetPage>>;
}
```

## LintDiff Equivalent

### Consolidated list-response coverage

The checks formerly proposed as `list-response-value-array` are part of the existing `list-response-envelope` rule; its public name is retained.

| Migrated lintdiff rule                                                                                                                                                                      | Coverage in this existing TypeSpec rule                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts)  | Checks that eligible collection response models have exactly the `value` and `nextLink` envelope properties, including inherited properties.         |
| [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md)                                                  | Requires the `value` property to be an array and combines that requirement with the standard envelope names.                                         |
| [XmsPageableMustHaveCorrespondingResponse](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/native/legacyRules/XmsPageableMustHaveCorrespondingResponse.ts) | Checks that the selected response body's schema contains the named next-link property; headers and ignored body properties do not satisfy the check. |

Both existing applicability populations are retained: ARM-provider collection GET paths and authored `@list` operations whose paging metadata has a `@nextLink`, including POST actions and provider-free operations. Strict envelope checks still use HTTP 200 response bodies. Paging metadata alone does not prove body correspondence, the array type, or the envelope shape; `list-operation-missing-pageable` remains a separate metadata check.

The original [XmsPageableMustHaveCorrespondingResponse documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-pageable-must-have-corresponding-response.md) describes an ARM-only error that runs for a truthy `x-ms-pageable.nextLinkName`. It selects 200, otherwise the first available 2xx response key, otherwise default, and skips absent or unresolved schemas. Integer response keys are enumerated numerically before range keys such as `2XX`. Native response selection preserves that precedence using HTTP metadata and semantic paging metadata, without inspecting emitted Swagger.

The existing native warning severity and applicability are unchanged. The combined native contract intentionally rejects custom next-link names and extra body properties for HTTP 200 even though the correspondence validator alone does not. Fallback responses receive only the named-property check. These mappings do not claim identical diagnostic counts or completed real-service equivalence validation.

Serialized-name correspondence uses native `resolveEncodedName` and the selected HTTP body's declared media types, including structured-suffix resolution such as `application/vnd.contoso+json`. The pinned emitter uses the semantic property's authored name for `nextLinkName`, but encoded property names in schemas. Its schema naming defaults to JSON except for globally XML-only emission. This native rule validates each declared response representation instead of reproducing emitter-wide XML naming decisions; mixed JSON/XML representations can therefore have additional native correspondence findings.

## Suppression

Suppress this rule only when compatibility requirements prevent a standard HTTP 200 envelope or require a next link outside the selected response body.
