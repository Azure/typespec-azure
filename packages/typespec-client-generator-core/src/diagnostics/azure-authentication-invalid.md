An Azure audience family must project to an SDK enum. Enable union-as-enum flattening for nested audience unions and do not replace the audience type with a non-enum alternate type.

Service environments must reference an authentication-model alternative actually used by the client. Refer to the exact model in `@useAuth`, rather than a different model with equivalent OAuth flows. Environment data belongs to the client; sharing an authentication model does not share endpoints between clients.

Child clients keep their own environment declarations, otherwise inherit from their SDK parents before falling back to service defaults. This includes virtual children created by `@clientLocation` and service-side children attached by `autoMergeService` to a customized client.
