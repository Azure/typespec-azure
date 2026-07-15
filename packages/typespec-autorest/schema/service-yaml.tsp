/**
 * Source of truth for the `service.yaml` manifest format emitted by `@azure-tools/typespec-autorest`.
 * The JSON Schema generated from this file is used for editor and CI validation.
 */
import "@typespec/json-schema";

using JsonSchema;

@jsonSchema("service.yaml")
model ServiceYaml {
  /** The API versions of the service, ordered oldest to newest. */
  versions: ServiceYamlVersion[];
}

/** A single API version entry in a `service.yaml` manifest. */
model ServiceYamlVersion {
  /** The API version value (e.g. `2023-11-01`). */
  version: string;

  /** Whether this version is generated from TypeSpec or is a legacy swagger version. */
  source: "typespec" | "swagger";

  /** Paths to the swagger/openapi file(s) for this version, relative to `service.yaml`. */
  `swagger-files`: string[];
}
