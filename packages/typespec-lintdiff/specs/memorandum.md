# Memorandum: differences from the ARM coverage gist

The validator results in this dataset are not expected to match the ARM coverage
gist:

https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a

The two reports use materially different validator inputs and execution paths.

## Primary difference: external references

The gist was produced from `test/harness/cross-repo-compare.ts`. Its Spectral
path reads each Swagger file into a plain JavaScript object and calls:

```ts
linter.run(swagger);
```

The object has no document source or resolver, so external `$ref` targets are not
resolved. Generated ARM Swagger commonly represents the API-version parameter as
a common-types reference:

```json
{
  "$ref": "../../../../common-types/resource-management/v5/types.json#/parameters/ApiVersionParameter"
}
```

`ApiVersionParameterRequired` has `resolved: true` and must inspect the referenced
parameter to see:

```json
{
  "name": "api-version",
  "in": "query"
}
```

When the reference remains unresolved, the rule sees only `$ref` and can report
that the operation has no API-version parameter. This explains the gist result:

```text
ApiVersionParameterRequired  Fired: 445 of 450 projects
```

The dataset harness instead invokes AutoRest with azure-validator:

```text
npm exec -- autorest --v3 --spectral --azure-validator
  --semantic-validator=false --model-validator=false
  --message-format=json --openapi-type=arm --openapi-subtype=arm
  --use=<openapi-validator> --input-file=<swagger>
```

AutoRest resolves the local references before running rules that require resolved
documents. Consequently, `ApiVersionParameterRequired` does not appear in the
dataset's normalized results.

## Reproduction on Microsoft.Fabric

For the same generated Fabric Swagger:

| Execution                                         | Total Spectral findings | `ApiVersionParameterRequired` |
| ------------------------------------------------- | ----------------------: | ----------------------------: |
| Plain-object Spectral, matching the gist harness  |                     217 |                            13 |
| AutoRest + azure-validator, matching this dataset |                       — |                             0 |

The Fabric operations do contain API-version parameters; they are external
common-types references. The 13 plain-object findings are therefore harness
artifacts, not equivalent validator findings.

## `ParameterDescription` comparison

The same unresolved-reference problem explains another large difference:

| Source            | Projects where `ParameterDescription` fired |
| ----------------- | ------------------------------------------: |
| ARM coverage gist |                                  445 of 450 |
| This dataset      |                                   44 of 468 |

The dataset contains 655 `ParameterDescription` diagnostics across those 44
projects and 84 latest-version Swagger files. The gist's `Fired` value is a
project count, so 44—not 655—is the comparable dataset number.

`ParameterDescription` checks operation parameter objects for a `description`.
When the gist harness receives an unresolved parameter:

```json
{
  "$ref": "../../../../common-types/resource-management/v5/types.json#/parameters/ApiVersionParameter"
}
```

it tests the `$ref` object itself. That object has no `description`, so the rule
reports a violation. The referenced parameter is valid after resolution:

```json
{
  "name": "api-version",
  "in": "query",
  "description": "The API version to use for this operation."
}
```

This was reproduced on the latest Microsoft.Fabric Swagger:

| Execution                                         | `ParameterDescription` findings |
| ------------------------------------------------- | ------------------------------: |
| Plain-object Spectral, matching the gist harness  |                              35 |
| AutoRest + azure-validator, matching this dataset |                               0 |

The gist's 445-project result is therefore dominated by referenced parameters
being evaluated before reference resolution. The dataset's 44 projects represent
resolved findings where emitted parameters actually lack descriptions.

## Other sources of difference

### Ruleset scope

The gist harness loads every exported Spectral ruleset:

```ts
Object.values(spectralRulesets);
```

This applies ARM, common, and data-plane rules regardless of project type. The
dataset explicitly runs with `openapi-type=arm` and `openapi-subtype=arm`.

### API versions

The gist harness validates all Swagger files emitted for a project and reduces
the result to whether each rule fired anywhere in that project. The dataset
retains and validates only the newest API date, regardless of stable or preview
status.

### Project denominator

The gist reports 450 successfully compiled projects but does not record its
specs commit or complete project list. This dataset pins the specs commit in
`_meta.json`; the current corpus contains 468 compiled and validated projects.

### Readme configuration

This dataset validates emitted Swagger directly with `--input-file`. It does not
apply service readme suppressions; `_meta.json` records
`readmeSuppressionsApplied: false`. The gist harness also bypasses readme
suppressions, but production spec-repo LintDiff runs by readme and tag, so its
results may differ from both datasets.

## Interpretation

The gist remains useful as evidence about the behavior of its cross-repo
comparison harness, but its `Fired`, `Lint`, `Official`, and `Pct` values should
not be treated as measurements of production Swagger LintDiff equivalence.

Use this dataset's raw JSONL when analyzing direct AutoRest/azure-validator
results. For exact spec-repo CI behavior, run production LintDiff with the
service readme and tag so that tag selection and suppressions are also applied.
