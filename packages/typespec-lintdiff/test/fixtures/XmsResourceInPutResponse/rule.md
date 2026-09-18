---
validatorRuleId: XmsResourceInPutResponse
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/xms-resource-in-put-response
---

# XmsResourceInPutResponse

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Native contract

An ARM PUT's primary 200/201 resource-shaped response model should be a registered ARM
resource. The native rule inspects the HTTP response body model, including inherited `name`
and `type` properties, and uses `getArmResource` to establish resource identity. It does not
read OpenAPI extension metadata or predict emitted schemas.

The existing scope is deliberately narrower than the Swagger selector: non-model bodies and
models without both resource-envelope properties are not checked. This is a resource-model
check, not full validation of every possible PUT response schema. Exact Swagger equivalence
is **partial**, despite the `lint` implementation-disposition metadata above.

## Source of truth

- [Validator implementation](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/with-xms-resource.ts)
- [Validator helpers](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/utils.ts#L185-L210)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/xms-resource-in-put-response.md)
- [Validator tests](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/test/with-xms-resource.test.ts)

`RPC-Put-V1-12` selects `"$[paths,'x-ms-paths'].*.put"`. `getReturnedSchema` chooses the first
schema under 200, otherwise 201; no selected schema means no diagnostic. `isXmsResource`
accepts a **truthy** `x-ms-azure-resource` value, recursively following inline `allOf`
objects. The helper does not itself resolve `$ref`; the surrounding validator's resolver
therefore affects observed external-reference behavior. The diagnostic targets the PUT
operation. The two upstream tests cover missing metadata and inherited metadata, with PATCH
present in the compliant control.

## Existing coverage and supported gap

The ARM guideline inventory maps RPC-Put-V1-12 to standard resource templates and
`arm-resource-operation-response`. Standard TrackedResource, ProxyResource and ExtensionResource
instances already carry resource semantics. That does not establish complete coverage for
decorated, manually authored operations:

- `arm-resource-operation` accepts an interface operation using `ApiVersionParameter` and
  `@armResourceCreateOrUpdate`.
- `arm-resource-operation-response` compares registered resource identities; an unregistered
  response model does not enter its mismatch branch.
- The native regression `covers a decorated manual response not checked by existing operation
rules` compiles without emitter imports or suppressions, verifies both existing rules are
  silent, and requires this rule's diagnostic on the unregistered response.
- `put-interface-missing-azure-resource` supplies the corresponding emitted comparison with
  `@armResourceOperations(#{ allowStaticRoutes: true })`, preserving its explicit path.

This is a **partial official-coverage gap**, not a justification based solely on the older
suppression-dependent fixtures. Those older namespace-level cases remain traversal regression
evidence, not proof that bypassing prerequisites is recommended authoring.

## Semantic and emission matrix

Emission descriptions below are research only. Relevant emitter code is
`packages/typespec-autorest/src/openapi.ts:attachExtensions`; production lint does not call it.
Tests are in `test/rules/xms-resource-in-put-response.test.ts` and this fixture directory.

| Authored shape                                                       | Validity/support                                                                              | Selected Swagger field/value                                                           | Swagger result                                     | Native result                       | Evidence                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Decorated manual PUT, unregistered `{name, type}` response           | Compiler-valid; no operation/response-consistency prerequisite diagnostic                     | Schema present; resource extension absent                                              | Violation                                          | Violation on response model         | Native supported-gap test; `put-interface-missing-azure-resource`                                                           |
| Registered TrackedResource response                                  | Standard supported ARM template                                                               | Schema present; resource metadata may be inherited via external common-types reference | Helper/resolver can report an ancestry discrepancy | Compliant                           | Native registered-resource test; `put-arm-resource` snapshots                                                               |
| Registered ProxyResource response                                    | Standard supported ARM template                                                               | Schema present; inherited resource metadata                                            | Same external-reference discrepancy in fixture     | Compliant                           | `put-with-azure-resource` snapshots                                                                                         |
| Inherited unregistered name/type properties                          | Compiler-valid native inheritance                                                             | Schema/allOf present; no native resource marker                                        | Violation                                          | Violation                           | Native inherited-envelope test                                                                                              |
| Only 201 model response                                              | Compiler-valid HTTP response                                                                  | 201 schema selected                                                                    | Same marker check                                  | Checked                             | Native 201 test                                                                                                             |
| 200 registered model and 201 unregistered model                      | Compiler-valid response union                                                                 | 200 schema selected first                                                              | Depends only on selected 200 schema                | Compliant                           | Native status-precedence test                                                                                               |
| Only 202 response                                                    | Compiler-valid HTTP response                                                                  | No selected 200/201 schema                                                             | Ignored                                            | Ignored                             | Native 202 test                                                                                                             |
| Scalar body or model without resource-envelope properties            | Compiler-valid, outside this narrower resource-model contract                                 | Schema may exist without marker                                                        | Can violate broader Swagger rule                   | Ignored; documented coverage limit  | Native scalar/non-resource-body tests; validator helper has no shape exemption                                              |
| Non-PUT operation                                                    | Compiler-valid HTTP operation                                                                 | Selector does not visit operation                                                      | Ignored                                            | Ignored                             | Native PATCH test; `patch-ignored`                                                                                          |
| Nested provider namespace                                            | Supported namespace/interface authoring                                                       | Same selected body/schema as parent namespace                                          | Checked                                            | Checked                             | Native nested test                                                                                                          |
| Service without ARM ownership                                        | Supported non-ARM authoring                                                                   | Not an ARM comparison population                                                       | Not applicable                                     | Ignored by lintdiff isolation guard | Native non-ARM service test                                                                                                 |
| Global/raw namespace-level PUT without resource operation decorators | Requires existing ARM operation suppression or emits its warning                              | May still emit                                                                         | Can violate                                        | May diagnose resource-shaped model  | Historical `put-missing-azure-resource`, nested and global fixtures; not supported-gap proof                                |
| Explicit `@extension("x-ms-azure-resource", true)` override          | Rejected by Azure Core `no-openapi` rule                                                      | Emitter can attach truthy flag                                                         | Can become compliant                               | Override is not consulted           | `no-openapi.ts:11-35`; previous fixture at source SHA `e32c35017be66df66ba90cab83b4a595a21558cb` suppressed this diagnostic |
| `Legacy.CustomAzureResource<true/false>`                             | Rejected by Azure Core `no-legacy-usage`; brownfield escape hatch, not normal supported input | Native legacy option controls emitted flag                                             | Results can differ by option                       | No special legacy-option exemption  | `no-legacy-usage.ts:14-28`, ARM `legacy-types/resource.tsp:200-217`, emitter `attachExtensions`                             |
| Historical version changes to body shape                             | Version metadata is valid; native rule sees the current semantic program                      | Selected emitted version may differ                                                    | Version-specific                                   | No historical-shape reconstruction  | Corpus attribution and limitations in `migration.md`                                                                        |

The native tests register the OpenAPI test library only because the ARM test host needs its
transitive library definitions. They neither author OpenAPI decorators nor import/run an
emitter. Removed OpenAPI and Legacy special cases are documented rather than replaced with
private state, decorator-name inspection, or copied emitter logic.

## Diagnostic population and promotion

The rule visits operations, selects the first model body at status 200, otherwise 201, and
reports on the response model. It preserves one report per visited operation; it does not
deduplicate across distinct operations sharing a model. It does not claim exact behavior for
every multi-content response or historical version.

The provider-ownership guard isolates ARM work in lintdiff's mixed ARM/data-plane execution.
It is not the semantic resource check. During promotion into an ARM-only ruleset, remove that
infrastructure guard unless provider metadata is independently needed; native promotion tests
must then cover ordinary and nested namespaces without unnecessary provider decorators.
Library/template filtering is a separate concern.

## Test cases

| Fixture                                       | Expected native result | Role                                                                                              |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `put-interface-missing-azure-resource`        | Violation              | Decorated, unsuppressed manual response gap                                                       |
| `put-missing-azure-resource`                  | Violation              | Historical suppressed raw-operation regression                                                    |
| `put-nested-namespace-missing-azure-resource` | Violation              | Historical suppressed namespace traversal regression                                              |
| `put-arm-resource`                            | Compliant              | Standard tracked resource; reviewed validator discrepancy                                         |
| `put-with-azure-resource`                     | Compliant              | Standard proxy resource, replacing the prohibited OpenAPI control; reviewed validator discrepancy |
| `patch-ignored`                               | Ignored                | Selector regression with recorded ambient diagnostics                                             |
| `global-put-ignored`                          | Ignored                | Isolation regression with recorded prerequisite diagnostics                                       |

See [migration evidence](./migration.md) for version/population attribution, complete project
sets, cardinality and the explicit limits on equivalence.
