---
validatorRuleId: RepeatedPathInfo
engine: spectral
coverageKind: partial
tspRuleset: resource-manager
tspLints:
  - tsp-lintdiff-local-linter/repeated-path-info
---

# RepeatedPathInfo

**Severity:** error

**Applies to:** Resource Manager (ARM)

Request body must not repeat information already in path or query parameters.

- linter code: [RepeatedPathInfo](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/body-param-repeated-info.ts)
- linter doc: [repeated-path-info.md](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/repeated-path-info.md)

## Original validator and official coverage

The Spectral rule runs only for PUT operations. It combines path-level and
operation-level parameters, keeps `path` and `query` parameter names, finds the
single body parameter, resolves its schema, then inspects only the nested
`properties` object under the resource envelope. If any property inside that
bag has the same name as a path or query parameter, the validator reports a
diagnostic at the matching PUT operation parameter entry. The implementation
does not inspect PATCH bodies or duplicate top-level envelope properties.

No official Azure Core or Azure Resource Manager lint rule currently enforces
this exact RPC-Put-V1-05 behavior. The closest official ARM rule,
`arm-resource-duplicate-property`, rejects envelope property names repeated
inside the `properties` bag, but it does not compare the bag against path or
query parameter names. The temporary lintdiff rule is therefore the active
native coverage for this migrated Swagger rule.

## Migrated TypeSpec behavior

The TypeSpec rule visits non-template PUT operations, reads their HTTP operation
metadata, gathers path and query parameter names, and checks the single model
request body. It reports each repeated property name found in the resource
`properties` model, including inherited properties, and deduplicates repeated
names within each operation. The comparison uses the **authored property name**
(`ModelProperty.name`) and the supported HTTP path/query parameter name.
The diagnostic unit is one matching name per concrete PUT operation: two PUT
operations sharing a properties declaration report twice at that declaration.
The rule does not recursively descend into nested members of the properties bag.

This intentionally follows TypeSpec authoring semantics rather than reconstructing
JSON encoding, Swagger parameter-array locations, or emitted duplicate occurrences.
In particular, `@encodedName("application/json", ...)` does not change the authored
property name. **Swagger parity is partial**, even for valid TypeSpec: an alias
can introduce or remove a duplicate JSON key without changing the native result.
For a `{widgetName}` path:

| Properties member                                                   | Native diagnostics | Swagger diagnostics |
| ------------------------------------------------------------------- | -----------------: | ------------------: |
| `@encodedName("application/json", "widgetName") otherName?: string` |                  0 |                   1 |
| `@encodedName("application/json", "otherName") widgetName?: string` |                  1 |                   0 |

The two source fixtures in `encoded-names/` are compiled by
`test/rules/repeated-path-info.test.ts` without an emitter and independently by
`test/rules/repeated-path-info-emission.test.ts` with AutoRest and the installed
Swagger validator function. They intentionally are not parity-harness `main.tsp`
cases: that harness expects mapped native diagnostics for Swagger violations.
The comparison suite instead asserts both emitted JSON keys and validator counts.
This explicit native contract does not require adding JSON-name handling to
production to obtain Swagger parity.

## Semantic coverage notes

The authorable semantic matrix covered locally is:

- PUT resource body repeats a path parameter inside `properties` => invalid
- PUT resource body repeats a query parameter inside `properties` => invalid
- PUT resource body repeats multiple path parameters => multiple invalid diagnostics
- PUT resource body inherits a repeated path parameter through `properties` model inheritance => invalid
- tenant-scoped PUT resource repeats its path parameter inside `properties` => invalid
- compliant PUT body with distinct `properties` members => valid
- repeated property only in PATCH/update payload => valid for this rule
- JSON alias alone repeats a path name => native compliant, Swagger violation
- authored name repeats a path name but JSON alias does not => native violation, Swagger compliant
- cycles and shared sibling models inside the bag => not recursively traversed
- a shared properties model used by two PUT operations => two diagnostics at the same source property
- a project-imported properties declaration => diagnostic targets that declaration

Additional scope note:

- A duplicate top-level resource envelope property is not a clean authorable ARM compliance case in TypeSpec because the existing `arm-resource-invalid-envelope-property` lint rejects it before this rule matters. The local fixture keeps that boundary documented but it should not be treated as a migration gap.
- A path and query parameter with the same HTTP name is rejected by `@typespec/http/incompatible-uri-param`; the native regression suite asserts that rejection rather than treating it as valid extra deduplication coverage.

| ID                             | Violation | Description                                                        |
| ------------------------------ | --------- | ------------------------------------------------------------------ |
| `body-repeats-path`            | true      | Body property repeats path parameter name                          |
| `body-repeats-path-in-base`    | true      | Repeated path parameter comes from an inherited properties model   |
| `body-repeats-query`           | true      | Body property repeats a PUT query parameter                        |
| `body-repeats-multiple-paths`  | true      | Body properties repeat more than one path parameter                |
| `tenant-body-repeats-path`     | true      | Tenant-scoped PUT body repeats the resource path parameter         |
| `body-no-repeats`              | false     | PUT request body uses a standard properties bag with no duplicates |
| `top-level-body-property-only` | false     | Duplicate only exists at the top level, outside `properties`       |
| `patch-body-repeats-path`      | false     | Duplicate only exists in PATCH payload, not PUT                    |
