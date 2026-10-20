An Azure known-audience enum must project to an SDK enum. Do not replace the catalog with a non-enum alternate type.

The SDK enum is a catalog of known resource values, not the type of accepted native audience input. Every language consumes the same enum declaration; emitters choose native audience APIs, custom-input support, and input compatibility. The catalog's fixed members do not require a closed native audience API.

Preserve the ordinary endpoint parameter independently: a resource URI does not identify a service instance, and an explicit client endpoint takes precedence over an environment endpoint default.

Service environments must reference an authentication-model alternative actually used by the client. Refer to the exact model in `@useAuth`, rather than a different model with equivalent OAuth flows. Environment data belongs to the client; sharing an authentication model does not share endpoints between clients.

Child clients keep their own environment declarations, otherwise inherit from their SDK parents before falling back to service defaults. This includes virtual children created by `@clientLocation` and service-side children attached by `autoMergeService` to a customized client.
