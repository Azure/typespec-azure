---
validatorRuleId: AvoidAnonymousTypes
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/avoid-anonymous-types
coverageKind: partial
---

# AvoidAnonymousTypes

**Severity:** error

**Applies to:** Both ARM and DataPlane

Types should not be anonymous.

## Source and native scope

- [Validator implementation](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/az-common.ts)
- [Schema predicate](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/avoid-anonymous-schema.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/avoid-anonymous-types.md)

The validator selects response schemas and object-valued `additionalProperties`
and `allOf` entries beneath definitions. It ignores null schemas, schemas with
`x-ms-client-name`, and schemas without nonempty properties, additional properties,
or composition.

The native rule supplements the enabled Azure Core `no-unnamed-types` rule:
only nonempty **implicit anonymous response models** are checked here, including
anonymous intersections. Model identity and name, not one syntax-node kind,
establish whether the response is anonymous.
Explicit `@body` and `@bodyRoot` property types already belong to that official
rule and are excluded. HTTP metadata is resolved with `getHttpOperation`; the
diagnostic targets the original response expression, not a synthesized payload.
Shared response model identities are reported once across operations.
Complete spreads of named models are accepted using the compiler's
`getEffectiveModelType` semantic source-property mapping. Its property filter
excludes headers and status codes from both the payload and candidate named
models, including when metadata occurs both inside and outside a complete spread.
An expression that adds new payload properties to a spread is still anonymous.

Named models, scalars, arrays, empty bodies, dictionaries, generic templates, and
property-position models are outside this supplemental check. In particular,
`Record<T>` is a supported native dictionary, not an anonymous model simply
because an emitter inlines its schema. The official rule's template-argument
exemption is preserved. OpenAPI extension overrides and emission-specific
composition are not inspected. Consequently this is **partial Swagger coverage**,
not exact schema-inlining parity.

Both ARM and data-plane authors can use implicit responses; there is no provider
namespace guard. Promotion must retain this supplemental boundary and must not
duplicate the official rule's property-position diagnostics.

| ID                               | Violation | Description                                         |
| -------------------------------- | --------- | --------------------------------------------------- |
| `compliant`                      | false     | Named response model                                |
| `implicit-response`              | true      | Inline response model with a payload property       |
| `intersection-response`          | true      | Anonymous intersection response                     |
| `metadata-response`              | true      | Inline payload with status and header metadata      |
| `metadata-spread-response`       | false     | Complete named spread containing HTTP metadata      |
| `split-metadata-spread-response` | false     | Named spreads with HTTP metadata inside and outside |
| `spread-response`                | false     | Complete reuse of a named model using spread        |

The named control's `use-standard-operations` suppression is ambient: custom
HTTP operations compile without the canonical-operation recommendation.
Emitter-free native tests additionally cover aliases, intersections, inherited/named models,
explicit bodies, empty and non-model bodies, templates, dictionaries, cycles,
shared siblings, multiple operations, and imported diagnostic targets.
