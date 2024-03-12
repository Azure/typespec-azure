import { createTypeSpecLibrary, JSONSchemaType, paramMessage } from "@typespec/compiler";

export interface AutorestCanonicalEmitterOptions {
  /**
   * Name of the output file.
   * Output file will interpolate the following values:
   *  - service-name: Name of the service if multiple
   *  - version: Version of the service if multiple
   *  - azure-resource-provider-folder: Value of the azure-resource-provider-folder option
   *
   * @default `{azure-resource-provider-folder}/{service-name}/{version}/openapi.json`
   *
   *
   * @example Single service no versioning
   *  - `canonical.openapi.json`
   *
   * @example Multiple services no versioning
   *  - `Service1.canonical.openapi.json`
   *  - `Service2.canonical.openapi.json`
   *
   * @example Single service with versioning
   *  - `canonical.openapi.json`
   *
   * @example Multiple service with versioning
   *  - `Service1.canonical.openapi.json`
   *  - `Service2.canonical.openapi.json`
   */
  "output-file"?: string;

  "azure-resource-provider-folder"?: string;

  /**
   * Set the newline character for emitting files.
   * @default lf
   */
  "new-line"?: "crlf" | "lf";

  /**
   * Omit unreachable types.
   * By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted.
   */
  "omit-unreachable-types"?: boolean;

  /**
   * If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it.
   * This extension is meant for debugging and should not be depended on.
   * @default "never"
   */
  "include-x-typespec-name"?: "inline-only" | "never";

  /**
   * Path to the common-types.json file folder.
   * @default "${project-root}/../../common-types/resource-management"
   */
  "arm-types-dir"?: string;
}

const EmitterOptionsSchema: JSONSchemaType<AutorestCanonicalEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-file": {
      type: "string",
      nullable: true,
      description: [
        "Name of the output file.",
        "Output file will interpolate the following values:",
        " - service-name: Name of the service if multiple",
        " - azure-resource-provider-folder: Value of the azure-resource-provider-folder option",
        "",
        "Default: `{azure-resource-provider-folder}/{service-name}/{version}/openapi.json`",
        "",
        "",
        "Example: Single service",
        " - `canonical.openapi.json`",
        "",
        "Example: Multiple services",
        " - `Service1.canonical.openapi.json`",
        " - `Service2.canonical.openapi.json`",
      ].join("\n"),
    },
    version: { type: "string", nullable: true },
    "azure-resource-provider-folder": { type: "string", nullable: true },
    "arm-types-dir": {
      type: "string",
      nullable: true,
      description:
        "Path to the common-types.json file folder. Default: '${project-root}/../../common-types/resource-management'",
    },
    "new-line": {
      type: "string",
      enum: ["crlf", "lf"],
      nullable: true,
      default: "lf",
      description: "Set the newline character for emitting files.",
    },
    "omit-unreachable-types": {
      type: "boolean",
      nullable: true,
      description:
        "Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted.",
    },
    "include-x-typespec-name": {
      type: "string",
      enum: ["inline-only", "never"],
      nullable: true,
      default: "never",
      description:
        "If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it.\nThis extension is meant for debugging and should not be depended on.",
    },
  },
  required: [],
};

const libDef = {
  name: "@azure-tools/typespec-autorest-canonical",
  diagnostics: {
    "duplicate-body-types": {
      severity: "error",
      messages: {
        default: "Request has multiple body types",
      },
    },
    "invalid-schema": {
      severity: "error",
      messages: {
        default: paramMessage`Couldn't get schema for type ${"type"}`,
      },
    },
    "union-null": {
      severity: "error",
      messages: {
        default: "Cannot have a union containing only null types.",
      },
    },
    "union-unsupported": {
      severity: "warning",
      messages: {
        default:
          "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type.",
        empty:
          "Empty unions are not supported for OpenAPI v2 - enums must have at least one value.",
      },
    },
    "invalid-default": {
      severity: "error",
      messages: {
        default: paramMessage`Invalid type '${"type"}' for a default value`,
      },
    },
    "invalid-multi-collection-format": {
      severity: "error",
      messages: {
        default: "The 'multi' should be applied to parameter in 'query', 'header' or 'formData'.",
      },
    },
    "inline-cycle": {
      severity: "error",
      messages: {
        default: paramMessage`Cycle detected in '${"type"}'. Use @friendlyName decorator to assign an OpenAPI definition name and make it non-inline.`,
      },
    },
    "nonspecific-scalar": {
      severity: "warning",
      messages: {
        default: paramMessage`Scalar type '${"type"}' is not specific enough. The more specific type '${"chosenType"}' has been chosen.`,
      },
    },
    "unsupported-http-auth-scheme": {
      severity: "warning",
      messages: {
        default: paramMessage`The specified HTTP authentication scheme is not supported by this emitter: ${"scheme"}.`,
      },
    },
    "unsupported-status-code-range": {
      severity: "error",
      messages: {
        default: paramMessage`Status code range '${"start"} to '${"end"}' is not supported. OpenAPI 2.0 can only represent range 1XX, 2XX, 3XX, 4XX and 5XX. Example: \`@minValue(400) @maxValue(499)\` for 4XX.`,
      },
    },
    "unsupported-multipart-type": {
      severity: "warning",
      messages: {
        default: paramMessage`Multipart parts can only be represented as primitive types in swagger 2.0. Information is lost for part '${"part"}'.`,
      },
    },
    "unsupported-param-type": {
      severity: "warning",
      messages: {
        default: paramMessage`Parameter can only be represented as primitive types in swagger 2.0. Information is lost for part '${"part"}'.`,
      },
    },
    "invalid-format": {
      severity: "warning",
      messages: {
        default: paramMessage`'${"schema"}' format '${"format"}' is not supported in AutorestCanonical. It will not be emitted.`,
      },
    },
    "unsupported-auth": {
      severity: "warning",
      messages: {
        default: paramMessage`Authentication "${"authType"}" is not a known authentication by the openapi3 emitter, it will be ignored.`,
      },
    },
    "unsupported-versioning-decorator": {
      severity: "warning",
      messages: {
        default: paramMessage`Decorator @${"decorator"} is not supported in AutorestCanonical.`,
      },
    },
  },
  emitter: {
    options: EmitterOptionsSchema as JSONSchemaType<AutorestCanonicalEmitterOptions>,
  },
} as const;

export const $lib = createTypeSpecLibrary(libDef);
export const { reportDiagnostic, createStateSymbol, getTracer } = $lib;
