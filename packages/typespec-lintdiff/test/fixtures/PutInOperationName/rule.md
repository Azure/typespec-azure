---
validatorRuleId: PutInOperationName
engine: spectral
coverageKind: partial
tspRuleset: resource-manager
tspLints:
  - tsp-lintdiff-local-linter/put-in-operation-name
---

# PutInOperationName

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

A PUT operation's authored name should begin with `create` in ARM services.

- linter code: [PutInOperationName](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/packages/rulesets/src/spectral/functions/put-in-operation-name.ts)
- linter doc: [put-in-operation-name.md](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/put-in-operation-name.md)

## Original validator and official coverage

The Spectral rule selects PUT `operationId` values under `paths` and
`x-ms-paths`. Empty/non-string values and IDs without underscores are skipped.
Otherwise the case-sensitive expressions `^(\w+)_(Create)` or `^(Create)`
must match. It emits one diagnostic at the `operationId` property, independent
of response codes. The documentation references SDK naming guideline M1006;
the RPC coverage inventory has no matching naming requirement. RPC009 covers
HTTP method intent, not operation names.

Official coverage is **partial**. Azure Core registers `use-standard-names`,
but its response-code-dependent naming contract allows `replace` for 200-only
PUT and it is disabled by the resource-manager ruleset. ARM's registered
`arm-resource-operation` checks decorators and API-version parameters, not
names. `ArmResourceCreateOrReplaceAsync` retains its concrete alias name through
`armResourceCreateOrUpdate`/`setResourceLifecycleOperation`; it does not rename
`set` to `create`. The new template fixtures demonstrate this uncovered ARM
behavior without OpenAPI overrides.

## Native contract and promotion

The native rule visits concrete HTTP endpoints of ARM services and checks the
case-insensitive `create` prefix of the authored operation name for PUT only.
It reports on the operation once, not on generic declarations or the internal
template instantiations used to construct an endpoint. Ordinary and inherited
interface operations, concrete aliases, and nested namespaces are included.

The ARM service predicate is lintdiff-only isolation: the mixed runner enables
all local rules in data-plane services too, where official naming guidance is
different. On promotion to ARM, remove this predicate and rely on the selected
ARM ruleset rather than require provider metadata on each namespace. Data-plane
behavior remains owned by Azure Core; this migration does not claim complete
coverage of the validator's `Both` applicability.

No emitter, TCGC, OpenAPI metadata, or unsafe version mutation is used in
production. Native tests register OpenAPI only because ARM imports it
transitively, and fail if the rule loads AutoRest or TCGC.

## Intentional Swagger differences

The native check is not an `operationId` formatter. It does not reproduce
underscore exemptions, regex quirks, interface/group-name shortcuts, explicit
OpenAPI IDs, or SDK-scoped name overrides. AutoRest's `resolveOperationId`
applies these emission choices; they do not change the native operation name.
Case-insensitive matching accommodates native camelCase and PascalCase names.
Other casing conventions remain the responsibility of the official casing rule.

The source program is checked, including operations declared for historical
versions, but historical names in `@renamedFrom` are not reconstructed.
Selected-version corpus comparison must attribute those separately;
the rule does not construct or mutate projected programs. Exact Swagger
coverage is therefore partial even when observed project populations agree.
See [migration evidence](./migration.md) for the shape matrix and count analysis.

## Test Cases

| ID                         | Violation | Description                                                      |
| -------------------------- | --------- | ---------------------------------------------------------------- |
| `compliant-with-template`  | true      | Manual `operationId` uses `Set` instead of `Create`              |
| `template-name-violation`  | true      | Standard ARM create template aliased as `set`, without overrides |
| `template-name-compliance` | false     | Same template aliased as `createOrUpdate`                        |

The legacy `compliant-with-template` name is retained for snapshot continuity.
Its raw operation suppresses official diagnostics and is not evidence that the
shape is supported ARM authoring. The new template pair and native tests supply
the supported-authoring evidence.
