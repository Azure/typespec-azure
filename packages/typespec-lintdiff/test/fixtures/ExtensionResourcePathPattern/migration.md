# ExtensionResourcePathPattern migration

## Result and gap summary

The refreshed full ordinary-ARM corpus has **0 validator findings and 0 native
warnings, affecting 0 projects**. All 468 projects were attempted; 462 compiled
and six remained unassessed, the same failed population as the baseline.
These are **not RPaaS equivalence counts**: the retained Swagger corpus selects
ARM validation, while this rule requires caller-selected RPaaS validation.
The native rule is now explicitly opt-in and absent from general `recommended`
and `all` enablement. This corrects the audience mismatch in historical coverage:
556 assessed native warnings across 40 projects against zero ARM-selected
validator findings.

Conditional native coverage is demonstrated separately: four explicitly opted-in
fixtures produce two matched violations and two matched compliant cases.
The supported path predicate is covered, but operation-versus-path diagnostic
units and source-versus-projected-version populations intentionally differ.
No RPaaS-selected production corpus was available; the six compile failures
and that selection limitation prevent any claim of universal production parity.

## Applicability and ownership

This is an **opt-in RPaaS routing policy**, not a blanket restriction on ARM
management-plane paths. The validator's documentation describes ARM Swagger,
but its registration uses `OpenApiTypes.rpaas`, category `RPaaSViolation`,
rule ID `R4038`, and selector `$.paths`.

The validator engine filters rules using the caller's OpenAPI-type mask.
AutoRest's `openapi-subtype` can select RPaaS (`providerHub` aliases `rpaas`);
the plugin reads the supplied input without rewriting its paths. Thus the
selection is an external processing contract, not a separately detected
authoring-service identity.

For native authoring, existing `linter.enable` supplies that external selection.
The rule does not inspect readmes, subtype/emitter options, generated OpenAPI,
ProviderHub payloads, or a new decorator. ARM resource and scope metadata do
not themselves identify provider-side RPaaS routing endpoints. For example,
the supported extension templates can describe either an arbitrary scope or a
specific external resource using the same resource model and provider namespace.

No existing official lint or template forbids the material opted-in violation:
`Extension.Read<Extension.ExternalResource<...>, Binding>` is supported ARM
authoring and produces the multiple-provider path in the fixture below.
Official `arm-resource-provisioning-state` also documents an RPaaS-validator
mapping without an automatic RPaaS identity selector, but its broader resource
policy is not evidence that this path policy should be universally enabled.

The intended destination is the ARM library. Promotion must preserve explicit
enablement and default inactivity rather than add an identity detector or
activate the rule for ordinary ARM services.

### Source of truth

The historical validator research links reference
[`1198225afecbb818c3050d4d2a91da92e14e56ce`](https://github.com/Azure/azure-openapi-validator/tree/1198225afecbb818c3050d4d2a91da92e14e56ce):

- [Rule implementation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/native/legacyRules/ExtensionResourcePathPattern.ts):
  visits path keys and reports when the first and last literal `/providers/`
  occurrences differ, once per path.
- [Rule documentation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/extension-resource-path-pattern.md):
  the parent URI is not passed to RPaaS extension routing.
- [Native validator test](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/native/tests/individual-azure-tests.ts):
  `rpaas extension resource` explicitly selects `OpenApiTypes.rpaas`.
- [Engine selection](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/azure-openapi-validator/core/src/runner.ts)
  and [AutoRest subtype selection](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/azure-openapi-validator/autorest/src/plugin-common.ts).

The current focused fixtures execute the installed native rulesets package
version `2.2.6`. Their metadata source checkout is
`6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`, not the linked research commit.
That research commit is unavailable in the local shared checkout, so a fresh
source diff against it could not be established. The passing fixture results
describe the installed engine; the links do not assert that engine's complete
source identity.

The retained catalog's `Both` classification is an extraction artifact, not
the native applicability contract; see [rule documentation](./rule.md).

## Native contract

- **Semantic API:** the resolved `HttpOperation.path` returned by
  `getHttpOperation(program, operation)`, including composed and inherited
  template routes.
- **Predicate:** more than one literal, case-sensitive `/providers/` segment.
  Zero or one is permitted; three segments still produce one operation warning.
- **Unit and target:** one warning targeted at each offending `Operation`.
  Distinct HTTP verbs on one path are not deduplicated. Uninstantiated operation
  and generic-interface templates are excluded before HTTP metadata resolution;
  instantiated endpoint operations remain in scope.
- **Versions:** declarations in the supplied semantic program. The rule does
  not project to a selected latest API version or reconstruct historical Swagger.
- **Audience:** explicit enablement of `extension-resource-path-pattern`.
  Registration alone does not enable it in any local ruleset.
- **Dependencies:** supported compiler and HTTP APIs only. No emitter,
  OpenAPI-extension inspection, TCGC, private metadata, or compiler mutation
  implements the predicate.

The neighboring native `path-characters` and `tenant-level-apis-not-allowed`
rules also inspect resolved HTTP paths. No custom resource traversal, reference
formatting, or additional namespace guard is needed for this externally selected
policy.

## Supported-shape and emitted-path evidence

The four comparison fixtures compile without compiler errors or suppressions.
Their generated `output.json`, `tsp-diagnostics.json`, and
`validator-diagnostics.json` are checked by strict snapshot validation.
Their rule-local `tspconfig.yaml` explicitly enables the native rule; the
validator harness selects the original rule's RPaaS type.

| Authoring shape                                                                              | Selected emitted field/value                                                   | RPaaS validator             | Explicitly enabled native rule                 | Evidence                                                                                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Manual GET route embedding a virtual-machine parent                                          | `paths`: subscription/resource-group/VM URI with two `/providers/` segments    | 1 path error                | 1 operation warning                            | `incorrect-extension-path`                                                                                     |
| Manual GET route accepting an arbitrary scope                                                | `paths`: `/{scope}/providers/Microsoft.TestService/extensions/{extensionName}` | 0                           | 0                                              | `scope-based-extension-path`                                                                                   |
| Supported `ExtensionResource` and `Extension.Read<Extension.ExternalResource<...>, Binding>` | `paths`: subscription/resource-group/VM URI with two `/providers/` segments    | 1 path error                | 1 operation warning                            | `template-specific-parent`                                                                                     |
| The same resource with `Extension.Read<Extension.ScopeParameter, Binding>`                   | `paths`: `/{scope}/providers/Microsoft.TestService/bindings/{bindingName}`     | 0                           | 0                                              | `template-scope`                                                                                               |
| Two valid operations using GET and DELETE on one repeated-provider route                     | Both verbs share one `paths` key                                               | 1 path error                | 2 operation warnings                           | Native `reports separate operations sharing one HTTP path`; emitter `initPathItem` and validator path-key loop |
| Removed and added versioned operations, both with repeated-provider routes                   | Only operations present in an emitted version are selected for that version    | Depends on selected version | 2 declaration warnings in the supplied program | Native `checks source operations rather than silently projecting to the newest version`                        |

For research only, AutoRest `openapi.ts: initPathItem` consumes the resolved
`HttpOperation.path` and places different verbs under the same path item.
Its alternate `x-ms-paths` branch is emitted-table behavior, not a native
applicability selector: the validator selects `$.paths`, whereas the native
contract examines operations regardless of predicted emitted table.
The rule intentionally does not simulate emission to reproduce table selection.
Swagger-only path-map entries without an authored operation likewise do not
expand the native contract.

Native tests additionally cover zero/one provider segments, three provider
segments, literal case-sensitive matching, a precise operation diagnostic target,
applicable operations without provider-namespace metadata, template declarations,
and instantiated template endpoints. Both published template snippets in `rule.md`
are compiled and tested directly.

### Default inactivity is independently tested

The supported specific-parent template has no target warning under:

- no linter ruleset;
- official general ARM rules;
- local `recommended`;
- local `all`;
- official ARM plus local `all`.

Explicit project enablement of the same rule produces one warning for the same
template. This demonstrates audience selection, not a claim that the template
is invalid ordinary ARM.

The native predicate suite does not import an emitter or TCGC. The separate
ruleset-wiring integration host registers transitive libraries required by the
official Azure rulesets; they do not implement this rule's decisions.

### Reviewed ambient diagnostics

The new compliant scope template has exactly three unrelated warnings:
`arm-resource-provisioning-state` because `BindingProperties` lacks that property;
`get-in-operation-name` because `Bindings.read` resolves to `Bindings_Read`;
and `xms-examples-required` because the GET has no examples extension.
Each count is one and is recorded in its `expect.json`, without suppression or
disabling the unrelated policies.

Updating the affected `TenantLevelAPIsNotAllowed` snapshots removes the
default-on extension warning from the supported management-group extension
template. Three other snapshots retain identical diagnostics with ordering
changes because the comparison worker now preserves existing project
`enable`/`disable` settings when adding its ruleset extensions. Its nine strict
cases pass; preexisting unrelated ambient-review classifications are unchanged.

## Full ordinary-ARM corpus

Specs commit:
`f6b53f105b95da05276530a0754a1c71b4f16397`.
The existing runner was used unchanged with concurrency 6. The representative
literal filter `ProviderHub.Management` selected one project, compiled
successfully, and produced 227 diagnostics across all enabled rules.
The subsequent unfiltered run attempted all 468 projects and completed normally.

| Population or result                             | Refreshed full run |
| ------------------------------------------------ | -----------------: |
| Dataset-selected/attempted projects              |                468 |
| Successfully compiled/assessed projects          |                462 |
| Failed/unassessed projects                       |                  6 |
| TypeSpec diagnostics across all rules            |             59,809 |
| Target validator diagnostics / affected projects |              0 / 0 |
| Target native diagnostics / affected projects    |              0 / 0 |
| Same-project finding overlap                     |                  0 |
| Validator-only finding projects                  |                  0 |
| Native-only finding projects                     |                  0 |

The complete target validator-only and native-only lists are both **empty**.
There are no target native findings to attribute to older-only versus
dataset-selected latest versions. This does not establish RPaaS parity:
the retained Swagger command selects ARM, and the native corpus runner enables
general `all`, which deliberately does not select this opt-in policy.

The historical coverage report had the same 468/462/6 population, zero validator
findings, and 556 assessed native warnings in 40 projects. Its raw index contains
614 warnings in 44 projects; 58 warnings in four failed projects are excluded
from that assessed count. The retained index and coverage report were generated
on August 10, 2026. The cleanup baseline preserves those existing bytes; it is
not a fresh pre-edit execution of the current rule/runtime. Consequently,
all-rule total differences are not attributed solely to this change.

Default inactivity removes the audience-mismatched target observations.
They are not 556 proven RPaaS false positives, and their raw version populations
are not reclassified as latest-version Swagger findings.

### Compile failures and uncertainty

The following six projects fail the native compile command and are excluded
from assessed comparisons. The failed-project list is identical to the captured
baseline, not a new rule-induced population change:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Their failed command records and stdout/stderr remain in the archived corpus
validation evidence. No compliance conclusion is drawn for those projects.

The native predicate has conditional functional coverage on supported authored
paths, not exact executable-Swagger or diagnostic-count equivalence. Production
RPaaS coverage remains unmeasured because that externally selected population
was not supplied. Generated corpus payloads and coverage reports are validation
evidence only and are excluded from the rule-development diff.
