import { createTypeSpecLibrary, JSONSchemaType, paramMessage } from "@typespec/compiler";

export interface AutorestEmitterOptions {
  /**
   * @deprecated DO NOT USE. Use built-in emitter-output-dir instead
   */
  "output-dir"?: string;

  /**
   * Name of the output file.
   * Output file will interpolate the following values:
   *  - service-name: Name of the service if multiple
   *  - version: Version of the service if multiple
   *  - azure-resource-provider-folder: Value of the azure-resource-provider-folder option
   *  - version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise.
   *
   * @default `{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json`
   *
   *
   * @example Single service no versioning
   *  - `openapi.yaml`
   *
   * @example Multiple services no versioning
   *  - `openapi.Org1.Service1.yaml`
   *  - `openapi.Org1.Service2.yaml`
   *
   * @example Single service with versioning
   *  - `openapi.v1.yaml`
   *  - `openapi.v2.yaml`
   *
   * @example Multiple service with versioning
   *  - `openapi.Org1.Service1.v1.yaml`
   *  - `openapi.Org1.Service1.v2.yaml`
   *  - `openapi.Org1.Service2.v1.0.yaml`
   *  - `openapi.Org1.Service2.v1.1.yaml`
   *
   * @example azureResourceProviderFolder is provided
   *  - `arm-folder/AzureService/preview/2020-01-01.yaml`
   *  - `arm-folder/AzureService/preview/2020-01-01.yaml`
   */
  "output-file"?: string;

  /**
   * Directory where the examples are located.
   * @default `{cwd}/examples`
   */
  "examples-directory"?: string;
  version?: string;
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

  /**
   * Determines whether to transmit the 'readOnly' property to lro status schemas.
   * @default false
   */
  "use-read-only-status-schema"?: boolean;
}

const EmitterOptionsSchema: JSONSchemaType<AutorestEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-dir": {
      type: "string",
      nullable: true,
      deprecated: true,
      description: "Deprecated DO NOT USE. Use built-in emitter-output-dir instead",
    },
    "output-file": {
      type: "string",
      nullable: true,
      description: [
        "Name of the output file.",
        "Output file will interpolate the following values:",
        " - service-name: Name of the service if multiple",
        " - version: Version of the service if multiple",
        " - azure-resource-provider-folder: Value of the azure-resource-provider-folder option",
        " - version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise.",
        "",
        "Default: `{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json`",
        "",
        "",
        "Example: Single service no versioning",
        " - `openapi.yaml`",
        "",
        "Example: Multiple services no versioning",
        " - `openapi.Org1.Service1.yaml`",
        " - `openapi.Org1.Service2.yaml`",
        "",
        "Example: Single service with versioning",
        " - `openapi.v1.yaml`",
        " - `openapi.v2.yaml`",
        "",
        "Example: Multiple service with versioning",
        " - `openapi.Org1.Service1.v1.yaml`",
        " - `openapi.Org1.Service1.v2.yaml`",
        " - `openapi.Org1.Service2.v1.0.yaml`",
        " - `openapi.Org1.Service2.v1.1.yaml`",
        "",
        "Example: azureResourceProviderFolder is provided",
        " - `arm-folder/AzureService/preview/2020-01-01.yaml`",
        " - `arm-folder/AzureService/preview/2020-01-01.yaml`",
      ].join("\n"),
    },
    "examples-directory": {
      type: "string",
      nullable: true,
      description: "Directory where the examples are located. Default: `{cwd}/examples`.",
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
    "use-read-only-status-schema": {
      type: "boolean",
      nullable: true,
      default: false,
      description: "Create read-only property schema for lro status",
    },
  },
  required: [],
};

const libDef = {
  name: "@azure-tools/typespec-autorest",
  diagnostics: {
    "security-service-namespace": {
      severity: "error",
      messages: {
        default: "Cannot add security details to a namespace other than the service namespace.",
      },
    },
    "resource-namespace": {
      severity: "error",
      messages: {
        default: "Resource goes on namespace",
      },
    },
    "missing-path-param": {
      severity: "error",
      messages: {
        default: paramMessage`Path contains parameter ${"param"} but wasn't found in given parameters`,
      },
    },
    "duplicate-body-types": {
      severity: "error",
      messages: {
        default: "Request has multiple body types",
      },
    },
    "duplicate-header": {
      severity: "error",
      messages: {
        default: paramMessage`The header ${"header"} is defined across multiple content types`,
      },
    },
    "duplicate-example": {
      severity: "error",
      messages: {
        default: "Duplicate @example declarations on operation",
      },
    },
    "duplicate-example-file": {
      severity: "error",
      messages: {
        default: paramMessage`Example file ${"filename"} uses duplicate title '${"title"}' for operationId '${"operationId"}'`,
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
    "invalid-property-type-for-collection-format": {
      severity: "error",
      messages: {
        default: "The collectionFormat can only be applied to model property with type 'string[]'.",
      },
    },
    "invalid-collection-format": {
      severity: "error",
      messages: {
        default: "The format should be one of 'csv','ssv','tsv','pipes' and 'multi'.",
      },
    },
    "non-recommended-collection-format": {
      severity: "warning",
      messages: {
        default: "The recommendation of collection format are 'csv' and 'multi'.",
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
    "example-loading": {
      severity: "warning",
      messages: {
        default: paramMessage`Skipped loading invalid example file: ${"filename"}. Error: ${"error"}`,
        noDirectory: paramMessage`Skipping example loading from ${"directory"} because there was an error reading the directory.`,
        noOperationId: paramMessage`Skipping example file ${"filename"} because it does not contain an operationId and/or title.`,
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
        default: paramMessage`'${"schema"}' format '${"format"}' is not supported in Autorest. It will not be emitted.`,
      },
    },
  },
  emitter: {
    options: EmitterOptionsSchema as JSONSchemaType<AutorestEmitterOptions>,
  },
} as const;

export const $lib = createTypeSpecLibrary(libDef);
export const { reportDiagnostic, createStateSymbol, getTracer } = $lib;
