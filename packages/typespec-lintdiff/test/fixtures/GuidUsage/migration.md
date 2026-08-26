# GuidUsage migration investigation

## Conclusion

The migrated TypeSpec rule required broader semantic traversal. The Swagger rule
flags every unresolved OpenAPI node whose `format` is `uuid`. The corrected
TypeSpec rule now covers authored UUID model properties, property-level
`@format("uuid")`, scalar inheritance, containers and unions, HTTP parameters,
request and response bodies, response headers, and template-generated resource
name parameters.

The final full corpus run used specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397` and was generated at
`2026-08-26T10:24:26Z`. Of 462 successfully compiled projects, Swagger fired in
48, TypeSpec fired in 46, and 44 overlapped directly. After excluding two
TypeSpec diagnostics outside the selected emitted API surface, all applicable
TypeSpec projects overlap Swagger. The four validator-only projects are
library-owned response headers or stale retained Swagger definitions with no
current authored UUID surface.

## Required TypeSpec changes

1. Traverse named models in the ARM service namespace, including unreferenced
   models that the emitter can include.
2. Traverse resolved ARM HTTP parameters, bodies, responses, and headers.
3. Recognize scalar formats and formats applied directly to model properties or
   generated HTTP parameters.
4. Follow custom scalar bases, arrays, records, tuples, unions, inherited
   properties, and cloned `sourceProperty` chains.
5. Fall back to the authored operation for direct scalar payloads and
   template-generated resource-name parameters.
6. Exclude imported library declarations and client-only namespaces, and
   deduplicate by authored semantic target.

## Report reconciliation

| Report                               | Population                                             | Validator projects | TypeSpec projects |      Overlap |      Validator-only |              TypeSpec-only |
| ------------------------------------ | ------------------------------------------------------ | -----------------: | ----------------: | -----------: | ------------------: | -------------------------: |
| `docs/coverage_old.md`               | 450 compiled projects; revision not recorded           |                 44 |                23 | not recorded | not reconstructable |               not recorded |
| checked-in corpus before this change | 462/468 successful projects at the pinned specs commit |                 48 |                32 |           27 |                  21 |                          5 |
| final full corpus                    | 462/468 successful projects at the pinned specs commit |                 48 |                46 |           44 |                   4 | 2 raw / 0 selected-emitted |

The external report is aggregate-only and cannot reconstruct its unmatched
projects. The current corpus retains project-level shards and selected API
versions, so its discrepancies can be attributed to source and emitted shapes.

## Final corpus result

| Measure                                         | Count |
| ----------------------------------------------- | ----: |
| Source projects                                 |   468 |
| Successfully compiled projects                  |   462 |
| Compile failures                                |     6 |
| Validator projects in successful population     |    48 |
| TypeSpec projects in successful population      |    46 |
| Direct project overlap                          |    44 |
| Validator-only projects                         |     4 |
| Raw TypeSpec-only projects                      |     2 |
| Selected-emitted TypeSpec-only projects         |     0 |
| Validator diagnostics in successful population  |   281 |
| TypeSpec diagnostics in successful population   |   247 |
| Validator diagnostics including failed projects |   283 |
| TypeSpec diagnostics including failed projects  |   253 |

Raw diagnostic equality is not expected. Swagger reports emitted occurrences,
so one source declaration can be duplicated across paths, operations, schemas,
and visibility variants. TypeSpec reports authored semantic targets and
deduplicates repeated traversal of the same target.

## Fixed semantic gaps

### Direct UUID response

The former rule only visited model properties. A direct
`ArmResponse<uuid>` therefore emitted a UUID response schema without a
TypeSpec diagnostic.

```typespec
fetchGuid(...ResourceInstanceParameters<Widget>):
  ArmResponse<uuid> | ErrorResponse;
```

The rule now traverses resolved response bodies and targets the authored
operation when the payload property belongs to a library template. The
`uuid-response` fixture proves this case.

### Property-level format

Maps contains string properties with an explicit format:

```typespec
@format("uuid")
federatedClientId?: string;
```

The format is stored on the `ModelProperty`, not the underlying `string`
scalar. The rule now checks both locations. The `uuid-format-property` fixture
proves the behavior.

### Template-generated resource name

StorageSync authors a UUID resource name through a template argument:

```typespec
...ResourceNameParameter<
  Resource = RegisteredServer,
  KeyName = "serverId",
  SegmentName = "registeredServers",
  Type = Azure.Core.uuid
>;
```

The generated HTTP property is library-owned. The rule now maps resolved ARM
operations back to their resource key and targets the authored operation.
`uuid-template-parameter` proves the typed case.

ProviderHub applies the format after template instantiation:

```typespec
@@format(AuthorizedApplication.name, "uuid");
```

The rule preserves format metadata from the generated HTTP parameter when it
uses the operation fallback. `uuid-template-format-parameter` proves this case.

## Remaining validator-only projects

- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertProcessingRules`
- `specification/discovery/Discovery.Management`
- `specification/hardwaresecuritymodules/resource-manager/Microsoft.HardwareSecurityModules/HardwareSecurityModules`
- `specification/impact/Impact.Management`

AlertProcessingRules and HardwareSecurityModules explicitly compose
`Azure.Core.RequestIdResponseHeader`. Swagger expands that imported header and
flags its `x-ms-request-id` format. The TypeSpec rule intentionally does not
place diagnostics on library-owned declarations; the services cannot change
the header's type at the diagnostic location.

Discovery and Impact each retain one Swagger definition named
`Azure.Core.uuid`, but their current TypeSpec projects contain no UUID or
`@format("uuid")` declaration. These are stale representation differences, not
authorable TypeSpec misses.

## Raw TypeSpec-only projects

### Dashboard

`Microsoft.Dashboard` declares a local `ManagedServiceIdentity` with formatted
`principalId` and `tenantId`, but the selected
`2025-09-01-preview` Swagger references common-types
`managedidentity.json` instead. The local model is unused and absent from the
selected emitted document. Its two diagnostics are excluded from the
selected-emitted comparison.

### Authorization policy

`PolicyEnrollmentProperties.policyAssignmentInstanceId` is UUID-typed, but its
containing `PolicyEnrollment` resource is added in
`2026-01-01-preview` and removed in `2026-06-01`. The retained Swagger version
is stable `2026-07-01`, so the diagnostic belongs only to an older preview API
surface and is excluded.

## Compile failures

The six excluded projects were:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Quota contributed two raw Swagger findings, while
DeviceProvisioningServices contributed six raw TypeSpec findings. The other
failed projects had no GuidUsage findings. Coverage excludes all six projects
from both sides, so these diagnostics do not create one-sided assessed results.

## Fixture evidence

Ten violating fixtures cover direct properties, property formats, custom
scalars, arrays, query parameters, request bodies, direct responses,
template-generated typed and formatted resource names, and unreferenced emitted
models. One compliance fixture covers comparable string shapes and a
client-only UUID model outside the ARM service namespace.

## Final statement

For the selected emitted API population, every authorable TypeSpec GuidUsage
project overlaps a Swagger project. The remaining Swagger-only projects are
explained by imported library headers or stale retained definitions, and the
raw TypeSpec-only findings are absent from the selected emitted surface. No
unresolved authorable rule-semantic gap remains.
