# EnumInsteadOfBoolean migration investigation

## Conclusion

The migrated TypeSpec rule
`tsp-lintdiff-local-linter/enum-instead-of-boolean` is functionally equivalent
to the Swagger `EnumInsteadOfBoolean` rule for authorable TypeSpec API surfaces.
The two rules shall be treated as equal for migration purposes. Raw diagnostic
counts are not expected to be equal because the rules run at different
representation layers.

## Why the two coverage reports differ

The ARM coverage gist and this repository's coverage report were produced from
different corpora and execution policies:

| Difference | ARM coverage gist | This repository |
| --- | --- | --- |
| Project result | 285 validator projects, 284 overlapping TypeSpec projects | 293 validator projects, 293 overlapping TypeSpec projects |
| Swagger scope | All emitted API versions | Newest emitted API date |
| TypeSpec scope | Unprojected source program | Program projected to the selected API version |
| Corpus | 450 successfully compiled projects from an unrecorded specs revision | 462 successfully compiled projects from pinned commit `f6b53f105b95da05276530a0754a1c71b4f16397` |
| Compile failures | Not recoverable from the aggregate gist | Excluded from both sides and retained in JSON metadata |

The gist contains only aggregate counts, so its single unmatched project cannot
be reconstructed. The current analysis initially found seven TypeSpec-only
projects. Their boolean declarations belonged to older API versions or
non-emitted source models and did not appear in the selected Swagger output.
Projecting TypeSpec to the selected API version and retaining only emitted
boolean property names removed all seven false positives. The resulting
project-level comparison is 293 validator projects, 293 TypeSpec projects, and
293 overlapping projects.

## Why raw diagnostic counts differ

For the same 293 projects, the report records 5,777 Swagger validator
diagnostics and 4,168 TypeSpec diagnostics. This does not represent a semantic
rule gap:

- The Swagger rule runs over emitted OpenAPI nodes. A single TypeSpec property
  can be copied into many Swagger files, schemas, visibility variants, inherited
  models, or template instantiations.
- The TypeSpec rule runs over source semantic targets and normally reports the
  authorable property once.
- Some Swagger schemas come from referenced or generated definitions without a
  distinct authorable TypeSpec target in the service namespace.
- Conversely, matching by emitted property name can retain multiple TypeSpec
  properties with the same common name even when fewer distinct Swagger paths
  are emitted.

SQL demonstrates the dominant duplication effect. It has 2,093 raw Swagger
diagnostics across 142 Swagger files, compared with 154 raw TypeSpec
diagnostics. Ignoring the Swagger filename and deduplicating by project and JSON
path produces 131 Swagger occurrences; deduplicating TypeSpec diagnostics by
project and source location also produces 131 occurrences.

Across the complete included corpus, the same conservative deduplication gives:

| Measure | Swagger | TypeSpec |
| --- | ---: | ---: |
| Raw diagnostics | 5,777 | 4,168 |
| Deduplicated occurrences | 3,815 | 3,722 |

Of the 293 projects, 259 have equal deduplicated counts, 30 have a total
Swagger excess of 98, and four have a total TypeSpec excess of five. The net
difference is 93. These deduplicated values still use different identities:
Swagger JSON paths versus TypeSpec source locations. They therefore cannot
prove or disprove one-to-one semantic equivalence.

Examples of the residual difference include one VMSS TypeSpec property named
`enableTcpReset` producing four distinct Swagger schema paths, and Container
Apps containing multiple source properties named `enabled` that cannot be
paired reliably using the emitted name alone.

## Equivalence judgment

The migration decision is based on behavior rather than raw cardinality:

1. Violating fixtures cover boolean model properties, parameters, request
   bodies, and response bodies.
2. A compliant fixture verifies that comparable non-boolean shapes do not fire.
3. Latest-version projection removes diagnostics for declarations outside the
   selected emitted API surface.
4. All 293 successfully compiled projects where the Swagger rule fires also
   fire the TypeSpec rule, with no TypeSpec-only projects after projection.
5. The remaining count difference is explained by source-to-emission
   cardinality and generated or referenced OpenAPI structures, not by a
   difference in the prohibition being enforced.

Therefore, the migrated TypeSpec rule has the same functional behavior as the
related Swagger validator rule and is accepted as an equivalent migration.
