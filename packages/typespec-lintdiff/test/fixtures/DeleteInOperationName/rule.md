---
validatorRuleId: DeleteInOperationName
engine: spectral
coverageKind: partial
tspLints:
  - tsp-lintdiff-local-linter/delete-in-operation-name
---

# DeleteInOperationName

**Severity:** warning

**Applies to:** Both ARM and DataPlane

Concrete HTTP DELETE operations should have an authored name starting with
`delete`, ignoring case. Consistent names make APIs easier to discover and help
maintain a predictable client experience. This rule reports once on each
offending service operation, not on client-only declarations.

## Incorrect

```typespec
@delete
@route("/widgets/{id}")
op remove(@path id: string): void;
```

## Correct

```typespec
@delete
@route("/widgets/{id}")
op deleteWidget(@path id: string): void;
```

These examples use generic HTTP authoring; import `@typespec/http`, use
`TypeSpec.Http`, and place the operation in a `@service` namespace.
The DELETE response shape does not affect the naming requirement.

## Suppression

Suppress only to retain compatibility with an existing API or shipped client.
Renaming an existing operation can break clients.

## Native contract and prior coverage

The implementation resolves concrete endpoints with `getAllHttpServices`, as do
the neighboring PUT and PATCH naming rules. It checks the authored operation
name and reports on that operation. It requires no ARM provider decorator,
SDK-name resolver, emitter, or OpenAPI metadata.

Azure Core `use-standard-names` already checks authored DELETE prefixes in the
data-plane ruleset, but is explicitly disabled in the ARM ruleset. Standard ARM
operation templates preserve a customized operation name; naming is not
template-enforced. This migration addresses the uncovered ARM audience and
incorrect nonendpoint diagnostic population, not a second official data-plane
authored-name rule.

Promotion should use the coordinator's authorized common SDK naming adaptation
in TCGC, preserving the verb, case-insensitive prefix, severity, and authored
diagnostic target while resolving the common SDK method name. That is a distinct
name domain from the official authored-name rule.

## LintDiff Equivalent

- linter code: [DeleteInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/delete-in-operation-name.ts)
- linter doc: [delete-in-operation-name.md](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-in-operation-name.md)

The validator examines DELETE `operationId` fields in `paths` and `x-ms-paths`.
It ignores empty/non-string IDs and all IDs without an underscore. For the
remaining IDs, its case-sensitive regular expressions accept a `Delete` prefix
either before the underscore or after a word-character group prefix.
The native rule intentionally checks authored names without reproducing
serialized-ID exemptions or SDK overrides. See [migration.md](./migration.md)
for shape, corpus, and parity evidence; partial mapping is not exact Swagger
equivalence.
