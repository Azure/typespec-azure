import { createTypeSpecLibrary, JSONSchemaType, paramMessage } from "@typespec/compiler";

export interface AutorestCanonicalEmitterOptions {
  /**
   * Name of the output file.
   * Output file will interpolate the following values:
   *  - service-name: Name of the service if multiple
   *  - version: Version of the service if multiple
   *  - azure-resource-provider-folder: Value of the azure-resource-provider-folder option
   *
   * @default `{azure-resource-provider-folder}/{service-name}/canonical/openapi.json`
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

  /**
   * Determines whether to transmit the 'readOnly' property to lro status schemas.
   * @default false
   */
  "use-read-only-status-schema"?: boolean;
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
        "Default: `{azure-resource-provider-folder}/{service-name}/canonical/openapi.json`",
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
  name: "@azure-tools/typespec-autorest-canonical",
  diagnostics: {
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
