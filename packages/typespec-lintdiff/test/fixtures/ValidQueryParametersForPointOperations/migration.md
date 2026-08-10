# ValidQueryParametersForPointOperations migration investigation

## Conclusion

The migrated TypeSpec rule is functionally equivalent to the Swagger
`ValidQueryParametersForPointOperations` rule. Point-operation classification
now uses the same provider-resource path shape as Swagger, and the real-service
comparison projects TypeSpec to the selected API version.

The verified successful-project result is 62 Swagger projects, 62 TypeSpec
projects, 62 overlapping projects, no Swagger-only projects, and no
TypeSpec-only projects. The migrated TypeSpec rule shall therefore be treated
as equal to the related Swagger rule.

## Why the production coverage report shows 0 versus 62 projects

The production AutoRest report is not a valid behavioral baseline for this
rule. The Swagger ruleset marks it as:

```js
stagingOnly: true
```

The validator plugin disables all `stagingOnly` rules unless
`is-staging-run` is enabled. The dataset uses the normal production AutoRest
command, so it intentionally records:

| Production report | Projects | Diagnostics |
| --- | ---: | ---: |
| Swagger `ValidQueryParametersForPointOperations` | 0 | 0 |
| TypeSpec `valid-query-parameters-for-point-operations` | 62 | 724 |

This is an execution-policy gap, not evidence that the TypeSpec rule invented
62 unsupported violations.

The older production Swagger rule `ParametersInPointGet` checks only GET
operations. All 40 included projects where that rule fires are covered by the
TypeSpec rule. The additional 22 TypeSpec projects include PUT, PATCH, and
DELETE violations covered by the broader staging rule.

## Comparable staging-rule population

Before the fixes, running the actual Spectral staging rule over the same
retained Swagger files produced 64 projects across all 468 generated projects,
matching the same-corpus count recorded in `specs/memorandum.md`. Restricting
both sides to the 462 projects whose TypeSpec compilation succeeded gave:

| Project comparison | Count |
| --- | ---: |
| Swagger projects | 62 |
| TypeSpec projects | 65 |
| Overlap | 62 |
| Swagger-only | 0 |
| TypeSpec-only | 3 |

The rule must be executed through Spectral for this comparison. Calling its
function directly on unresolved JSON misses locally referenced parameter
objects and undercounts the Swagger result.

## Former TypeSpec-only projects

### Container Apps: latest-version scope

The TypeSpec rule reports these DELETE parameters:

- `ignoreWorkflowDeletionFailure`
- `deleteWorkflow`

Both declarations have `@removed(Versions.v2026_01_01)`. The retained Swagger
version is `2026-01-01`, whose DELETE operation contains neither parameter.
This is not a semantic rule difference. It is caused by linting the unprojected
source program while validating only the latest emitted Swagger version.

### Private DNS: list operation classified as a point read

The TypeSpec rule reports `$top` and `$recordsetnamesuffix` on
`RecordSets.listByType`. The operation is explicitly decorated with `@list` and
emits:

```text
.../privateDnsZones/{privateZoneName}/{recordType}
```

The Swagger path classifier requires resource-type/resource-name pairs after
the provider namespace. The trailing `/{recordType}` is not such a pair, so the
Swagger rule correctly excludes this list operation.

The TypeSpec implementation checks ARM operation kind before path shape.
`listByType` is represented by a custom ARM read template, so it is accepted as
a point operation despite being a list. This false positive was removed by requiring the Swagger-compatible provider
resource path shape.

### Resource Groups: providerless resource path

The TypeSpec rule reports `forceDeletionTypes` on Resource Groups DELETE. Its
path is:

```text
/subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}
```

The Swagger classifier requires a `/providers/{namespace}` segment and
therefore does not classify this operation as an ARM point-resource path. The
TypeSpec implementation accepts it because its ARM operation kind is `delete`.
This false positive was removed by requiring the Swagger-compatible provider
resource path shape.

## Diagnostic cardinality

Before the semantic and projection fixes, the comparable staging execution over
the 462 successfully compiled projects produced:

| Measure | Swagger | TypeSpec |
| --- | ---: | ---: |
| Raw diagnostics | 321 | 749 |
| Unique operation parameters / source targets | 321 | 290 |

TypeSpec raw diagnostics collapse from 749 to 290 when deduplicated by project,
source file, line, column, and message. Template instantiation and versioned
operation traversal can report the same authorable parameter target multiple
times.

The remaining unique-count difference is also not one-to-one. A shared
TypeSpec parameter model may be emitted into several Swagger operations:

| Project | Swagger operation parameters | TypeSpec source targets | Principal cause |
| --- | ---: | ---: | --- |
| Deployment Stacks | 30 | 5 | Five shared delete parameters emitted into six delete operations |
| Machine Learning Services | 14 | 5 | Shared parameter declarations reused by multiple operations |
| API Management | 30 | 22 | Reused parameter declarations and operation templates |
| SCVMM | 7 | 2 | Shared source parameters emitted across several operations |

Across the 65-project union, 52 projects have equal unique counts. Four
projects have a total Swagger excess of 47, while nine have a total TypeSpec
excess of 16. The net count difference must not be interpreted as unmatched
behavior because Swagger operation-parameter identities and TypeSpec source
targets have different cardinalities.

## Implemented changes

1. Point operations are classified with the same provider-path shape as the
   Swagger `isPointOperation()` helper. ARM operation kind no longer makes
   providerless or list-shaped operations eligible.
2. Compliant fixtures cover a read-kind list-shaped path and a providerless
   Resource Groups-style DELETE.
3. The comparison harness projects the TypeSpec program to the API version
   selected for Swagger before retaining point-query diagnostics.
4. The staging Spectral comparison was rerun over all successfully compiled
   projects:

| Verification | Swagger | TypeSpec |
| --- | ---: | ---: |
| Projects | 62 | 62 |
| Diagnostics | 321 | 724 |
| One-sided projects | 0 | 0 |

The diagnostic totals remain unequal because shared TypeSpec source parameters
can be instantiated repeatedly and emitted into multiple Swagger operations.
Functional equivalence is established by aligned project coverage, fixtures,
and the investigated source-to-emission cardinality rather than raw count
equality.
