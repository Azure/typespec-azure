# ConsistentResponseSchemaForPut migration evidence

## Sources and scope

- azure-rest-api-specs commit:
  `f6b53f105b95da05276530a0754a1c71b4f16397`
- azure-openapi-validator commit:
  `1198225afecbb818c3050d4d2a91da92e14e56ce`
- Validator registration: ARM, `RPC-Put-V1-29`, `stagingOnly: true`,
  `resolved: true`, OpenAPI 2, selector `$.paths.*`.
- TypeSpec corpus run: full, 468 projects, completed
  `2026-09-04T06:33:34.471Z` in 1,325,399 ms.

The checked-in production comparison cannot measure this rule: production mode
shows zero validator projects because the rule is staging-only. The older
external report lists 8 validator projects and 1 TypeSpec project but does not
retain reconstructable project sets. A dedicated one-rule staging scan was
therefore used to establish the validator population.

## Focused behavior

Eleven focused fixtures cover the exact verb/status gates, absent statuses and
bodies, named and inline schema families, external references, binary and
multipart responses, and multiple content variants. Two violation fixtures are
covered by the local lint. Six validator-clean compliance fixtures remain clean.
Three compliance fixtures explicitly record reviewed Swagger false positives:

- 1 identical external-reference diagnostic;
- 6 identical inline-schema diagnostics;
- 5 identical binary/multipart/tuple/string/array-schema diagnostics.

These false positives come from comparing resolved JavaScript objects with
`!==`, not from a difference in emitted schema values.

## Corpus comparison

The staging Swagger scan found 13 diagnostics across 8 projects:

- `specification/durabletask/resource-manager/Microsoft.DurableTask/DurableTask`
- `specification/maps/resource-manager/Microsoft.Maps/Maps`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/postgresqlhsc/resource-manager/Microsoft.DBforPostgreSQL/PostgresqlHsc`
- `specification/redis/resource-manager/Microsoft.Cache/Redis`
- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Quota`
- `specification/security/resource-manager/Microsoft.Security/Security/PrivateLinksAPI`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`

The final full TypeSpec run produced 1 diagnostic in 1 project:

- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Quota`

Selected-version behavioral comparison:

| Population           | Projects | Diagnostics |
| -------------------- | -------: | ----------: |
| Swagger staging      |        8 |          13 |
| TypeSpec full corpus |        1 |           1 |
| Same-project overlap |        1 |           1 |
| Validator-only       |        7 |          12 |
| TypeSpec-only        |        0 |           0 |

No TypeSpec-only diagnostics required older-version exclusion.

### Genuine overlap

Quota's create/update response returns `CurrentQuotaLimitBase` for `200` and
`QuotaRequestSubmitResponse201` for `201`. The local rule reports the operation
at `CurrentQuotaLimitBase.tsp:71`, matching the intended Swagger violation.

### Validator-only projects

DurableTask, Maps, MySQL FlexibleServers, PostgreSQL HSC, Redis, Security
PrivateLinks, and SQL account for all 12 validator-only diagnostics. In every
case the emitted `200` and `201` `$ref` strings are identical. The resolved
validator materializes separate object instances and reports them as unequal.
DurableTask is representative: both responses use the same private-endpoint
resource type, but the staging validator still reports the identical external
reference. Reproducing this object-identity artifact would reject consistent
TypeSpec APIs, so it is intentionally excluded.

## Failed projects

Six projects failed the TypeSpec lint process and were excluded from the
assessed population:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

None is one of the eight staging Swagger projects; the similarly named genuine
overlap is the separate Reservations/Quota project.

## Official coverage and conclusion

`@azure-tools/typespec-azure-core/response-schema-problem` is not equivalent.
It compares all non-error response bodies for every HTTP verb and success-status
combination, producing out-of-scope findings such as POST `200`/`201` and PUT
`200`/`202`.

The dedicated rule is functionally equivalent to the intended
`ConsistentResponseSchemaForPut` contract: ARM PUT only, exact `200` and `201`
responses only, both schemas required, and consistent emitted schema identity.
It deliberately excludes the validator's resolved-object identity defects while
preserving genuine named-schema and inline-schema differences. The emission
matrix in `rule.md`, focused fixtures, and full corpus leave no unresolved
semantic uncertainty.
