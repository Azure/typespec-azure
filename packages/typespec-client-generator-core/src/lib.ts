import { createTypeSpecLibrary, fileRef, JSONSchemaType, paramMessage } from "@typespec/compiler";
import {
  BrandedSdkEmitterOptionsInterface,
  TCGCEmitterOptions,
  UnbrandedSdkEmitterOptionsInterface,
} from "./internal-utils.js";

// `api-version` accepts either a string (single service / `latest` / `all`) or a
// map from service namespace full name to version (multi-service).
const apiVersionSchema = {
  oneOf: [
    {
      type: "string",
      nullable: true,
    },
    {
      type: "object",
      additionalProperties: { type: "string" },
      required: [],
      nullable: true,
    },
  ],
  description:
    "Use this flag if you would like to generate the sdk only for a specific version. Default value is the latest version. Also accepts values `latest` and `all`. For multi-service packages, provide a map from each service namespace's full name to its desired version; services not listed default to their latest version.",
} as any;

export const UnbrandedSdkEmitterOptions = {
  "generate-protocol-methods": {
    "generate-protocol-methods": {
      type: "boolean",
      nullable: true,
      description:
        "When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.",
    },
  },
  "generate-convenience-methods": {
    "generate-convenience-methods": {
      type: "boolean",
      nullable: true,
      description:
        "When set to `true`, the emitter will generate convenience methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.",
    },
  },
  "api-version": {
    "api-version": apiVersionSchema,
  },
  license: {
    license: {
      type: "object",
      additionalProperties: false,
      nullable: true,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          nullable: false,
          description:
            "License name. The config is required. Predefined license are: MIT License, Apache License 2.0, BSD 3-Clause License, MPL 2.0, GPL-3.0, LGPL-3.0. For other license, you need to configure all the other license config manually.",
        },
        company: {
          type: "string",
          nullable: true,
          description: "License company name. It will be used in copyright sentences.",
        },
        link: {
          type: "string",
          nullable: true,
          description: "License link.",
        },
        header: {
          type: "string",
          nullable: true,
          description:
            "License header. It will be used in the header comment of generated client code.",
        },
        description: {
          type: "string",
          nullable: true,
          description: "License description. The full license text.",
        },
      },
      description: "License information for the generated client code.",
    },
  },
} as const;

const UnbrandedSdkEmitterOptionsInterfaceSchema: JSONSchemaType<UnbrandedSdkEmitterOptionsInterface> =
  {
    type: "object",
    additionalProperties: false,
    properties: {
      ...UnbrandedSdkEmitterOptions["generate-protocol-methods"],
      ...UnbrandedSdkEmitterOptions["generate-convenience-methods"],
      ...UnbrandedSdkEmitterOptions["api-version"],
      ...UnbrandedSdkEmitterOptions["license"],
    },
  };

export const BrandedSdkEmitterOptions = {
  "examples-dir": {
    "examples-dir": {
      type: "string",
      nullable: true,
      format: "absolute-path",
      description:
        "Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.",
    },
  },
  namespace: {
    namespace: {
      type: "string",
      nullable: true,
      description:
        "Specifies the namespace you want to override for namespaces set in the spec. With this config, all namespace for the spec types will default to it.",
    },
  },
} as const;

const BrandedSdkEmitterOptionsSchema: JSONSchemaType<BrandedSdkEmitterOptionsInterface> = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...UnbrandedSdkEmitterOptionsInterfaceSchema.properties!,
    ...BrandedSdkEmitterOptions["examples-dir"],
    ...BrandedSdkEmitterOptions["namespace"],
  },
};

const TCGCEmitterOptionsSchema: JSONSchemaType<TCGCEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "emitter-name": {
      type: "string",
      nullable: true,
      description: "Set `emitter-name` to output TCGC code models for specific language's emitter.",
    },
    ...BrandedSdkEmitterOptionsSchema.properties!,
  },
};

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-client-generator-core",
  diagnostics: {
    "union-null": {
      docs: fileRef.fromPackageRoot("src/diagnostics/union-null.md"),
      severity: "warning",
      messages: {
        default: "Cannot have a union containing only null types.",
      },
    },
    "union-circular": {
      docs: fileRef.fromPackageRoot("src/diagnostics/union-circular.md"),
      severity: "warning",
      messages: {
        default: "Cannot have a union containing self.",
      },
    },
    "invalid-access": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-access.md"),
      severity: "error",
      messages: {
        default: `Access value must be "public" or "internal".`,
      },
    },
    "invalid-usage": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-usage.md"),
      severity: "error",
      messages: {
        default: `Usage value must be one of: 2 (input), 4 (output), 256 (json), or 512 (xml).`,
      },
    },
    "conflicting-multipart-model-usage": {
      docs: fileRef.fromPackageRoot("src/diagnostics/conflicting-multipart-model-usage.md"),
      severity: "error",
      messages: {
        default: paramMessage`Model '${"modelName"}' cannot be used as both multipart/form-data input and regular body input. You can create a separate model with name 'model ${"modelName"}FormData' extends ${"modelName"} {}`,
      },
    },
    "wrong-client-decorator": {
      docs: fileRef.fromPackageRoot("src/diagnostics/wrong-client-decorator.md"),
      severity: "warning",
      messages: {
        default: "@client should decorate namespace or interface in client.tsp",
      },
    },
    "unsupported-kind": {
      docs: fileRef.fromPackageRoot("src/diagnostics/unsupported-kind.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Unsupported kind ${"kind"}`,
      },
    },
    "server-param-not-path": {
      docs: fileRef.fromPackageRoot("src/diagnostics/server-param-not-path.md"),
      severity: "error",
      messages: {
        default: paramMessage`Template argument ${"templateArgumentName"} is not a path parameter, it is a ${"templateArgumentType"}. It has to be a path.`,
      },
    },
    "unexpected-http-param-type": {
      docs: fileRef.fromPackageRoot("src/diagnostics/unexpected-http-param-type.md"),
      severity: "error",
      messages: {
        default: paramMessage`Expected parameter "${"paramName"}" to be of type "${"expectedType"}", but instead it is of type "${"actualType"}"`,
      },
    },
    "multiple-response-types": {
      docs: fileRef.fromPackageRoot("src/diagnostics/multiple-response-types.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Multiple response types found in operation ${"operation"}. Some emitters might not support returning all of these response types`,
      },
    },
    "no-corresponding-method-param": {
      docs: fileRef.fromPackageRoot("src/diagnostics/no-corresponding-method-param.md"),
      severity: "error",
      messages: {
        default: paramMessage`Missing HTTP operation parameter "${"paramName"}" in method "${"methodName"}". Please check the method definition.`,
      },
    },
    "unsupported-protocol": {
      docs: fileRef.fromPackageRoot("src/diagnostics/unsupported-protocol.md"),
      severity: "error",
      messages: {
        default: "Currently we only support HTTP and HTTPS protocols",
      },
    },
    "no-emitter-name": {
      docs: fileRef.fromPackageRoot("src/diagnostics/no-emitter-name.md"),
      severity: "warning",
      messages: {
        default: "Can not find name for your emitter, please check your emitter name.",
      },
    },
    "unsupported-generic-decorator-arg-type": {
      docs: fileRef.fromPackageRoot("src/diagnostics/unsupported-generic-decorator-arg-type.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Can not parse the arg type for decorator "${"decoratorName"}".`,
      },
    },
    "empty-client-name": {
      docs: fileRef.fromPackageRoot("src/diagnostics/empty-client-name.md"),
      severity: "warning",
      messages: {
        default: `Cannot pass an empty value to the @clientName decorator`,
      },
    },
    "override-parameters-mismatch": {
      docs: fileRef.fromPackageRoot("src/diagnostics/override-parameters-mismatch.md"),
      severity: "error",
      messages: {
        default: paramMessage`Method "${"methodName"}" has different parameters definition from the override operation. Please check the parameter defined in the override operation: "${"checkParameter"}".`,
      },
    },
    "duplicate-client-name": {
      docs: fileRef.fromPackageRoot("src/diagnostics/duplicate-client-name.md"),
      severity: "error",
      messages: {
        default: paramMessage`Client name: "${"name"}" is duplicated in language scope: "${"scope"}"`,
        nonDecorator: paramMessage`Client name: "${"name"}" is defined somewhere causing naming conflicts in language scope: "${"scope"}"`,
      },
    },
    "duplicate-client-name-warning": {
      docs: fileRef.fromPackageRoot("src/diagnostics/duplicate-client-name-warning.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Client name: "${"name"}" is duplicated in language scope: "${"scope"}"`,
        nonDecorator: paramMessage`Client name: "${"name"}" is defined somewhere causing naming conflicts in language scope: "${"scope"}"`,
      },
    },
    "client-name-ineffective": {
      docs: fileRef.fromPackageRoot("src/diagnostics/client-name-ineffective.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Application of @clientName decorator to ${"name"} is not effective`,
        override: paramMessage`Application of @clientName decorator to ${"name"} is not effective because it is applied to the override method. Please apply it on the original method definition "${"originalMethodName"}" instead.`,
      },
    },
    "example-loading": {
      docs: fileRef.fromPackageRoot("src/diagnostics/example-loading.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Skipped loading invalid example file: ${"filename"}. Error: ${"error"}`,
        noDirectory: paramMessage`Skipping example loading from ${"directory"} because there was an error reading the directory.`,
        noOperationId: paramMessage`Skipping example file ${"filename"} because it does not contain an operationId and/or title.`,
      },
    },
    "duplicate-example-file": {
      docs: fileRef.fromPackageRoot("src/diagnostics/duplicate-example-file.md"),
      severity: "error",
      messages: {
        default: paramMessage`Example file ${"filename"} uses duplicate title '${"title"}' for operationId '${"operationId"}'`,
      },
    },
    "example-value-no-mapping": {
      docs: fileRef.fromPackageRoot("src/diagnostics/example-value-no-mapping.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Value in example file '${"relativePath"}' does not follow its definition:\n${"value"}`,
      },
    },
    "flatten-polymorphism": {
      docs: fileRef.fromPackageRoot("src/diagnostics/flatten-polymorphism.md"),
      severity: "error",
      messages: {
        default: `Cannot flatten property of polymorphic type.`,
      },
    },
    "conflict-access-override": {
      docs: fileRef.fromPackageRoot("src/diagnostics/conflict-access-override.md"),
      severity: "warning",
      messages: {
        default: `@access override conflicts with the access calculated from operation or other @access override.`,
      },
    },
    "empty-client-namespace": {
      docs: fileRef.fromPackageRoot("src/diagnostics/empty-client-namespace.md"),
      severity: "warning",
      messages: {
        default: `Cannot pass an empty value to the @clientNamespace decorator`,
      },
    },
    "unexpected-pageable-operation-return-type": {
      docs: fileRef.fromPackageRoot("src/diagnostics/unexpected-pageable-operation-return-type.md"),
      severity: "error",
      messages: {
        default: `The response object for the pageable operation is either not a paging model, or is not correctly decorated with @nextLink and @pageItems.`,
      },
    },
    "invalid-alternate-type": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-alternate-type.md"),
      severity: "error",
      messages: {
        default: paramMessage`Invalid alternate type. If the source type is Scalar, the alternate type must also be Scalar. Found alternate type kind: '${"kindName"}'`,
      },
    },
    "invalid-initialized-by": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-initialized-by.md"),
      severity: "error",
      messages: {
        default: paramMessage`Invalid 'initializedBy' value. ${"message"}`,
      },
    },
    "invalid-deserializeEmptyStringAsNull-target-type": {
      docs: fileRef.fromPackageRoot(
        "src/diagnostics/invalid-deserializeEmptyStringAsNull-target-type.md",
      ),
      severity: "error",
      messages: {
        default:
          "@deserializeEmptyStringAsNull can only be applied to `ModelProperty` of type 'string' or a `Scalar` derived from 'string'.",
      },
    },
    "invalid-encode-for-collection-format": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-encode-for-collection-format.md"),
      severity: "warning",
      messages: {
        default:
          "Only encode of `ArrayEncoding.pipeDelimited` and `ArrayEncoding.spaceDelimited` is supported for collection format.",
      },
    },
    "non-head-bool-response-decorator": {
      docs: fileRef.fromPackageRoot("src/diagnostics/non-head-bool-response-decorator.md"),
      severity: "warning",
      messages: {
        default: paramMessage`@responseAsBool decorator can only be used on HEAD operations. Will ignore decorator on ${"operationName"}.`,
      },
    },
    "require-versioned-service": {
      docs: fileRef.fromPackageRoot("src/diagnostics/require-versioned-service.md"),
      severity: "warning",
      description: "Require a versioned service to use this decorator",
      messages: {
        default: paramMessage`Service "${"serviceName"}" must be versioned if you want to apply the "${"decoratorName"}" decorator`,
      },
    },
    "missing-service-versions": {
      docs: fileRef.fromPackageRoot("src/diagnostics/missing-service-versions.md"),
      severity: "warning",
      description: "Missing service versions",
      messages: {
        default: paramMessage`The @clientApiVersions decorator is missing one or more versions defined in ${"serviceName"}. Client API must support all service versions to ensure compatibility. Missing versions: ${"missingVersions"}. Please update the client API to support all required service versions.`,
      },
    },
    "invalid-client-doc-mode": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-client-doc-mode.md"),
      severity: "error",
      messages: {
        default: paramMessage`Invalid mode '${"mode"}' for @clientDoc decorator. Valid values are "append" or "replace".`,
      },
    },
    "multiple-param-alias": {
      docs: fileRef.fromPackageRoot("src/diagnostics/multiple-param-alias.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Multiple param aliases applied to '${"originalName"}'. Only the first one '${"firstParamAlias"}' will be used.`,
      },
    },
    "client-location-conflict": {
      docs: fileRef.fromPackageRoot("src/diagnostics/client-location-conflict.md"),
      severity: "warning",
      messages: {
        default:
          "@clientLocation with string target could not be used for multiple root clients scenario",
        operationToOperation:
          "`@clientLocation` cannot be used to move an operation to another operation. Operations can only be moved to interfaces or namespaces.",
        modelPropertyToClientInitialization: paramMessage`There is already a parameter called '${"parameterName"}' in the client initialization.`,
        modelPropertyToString:
          "`@clientLocation` can only move model properties to interfaces or namespaces.",
        parameterTypeConflict: paramMessage`@clientLocation cannot move multiple parameters named '${"parameterName"}' with different types to the same client. This often happens when @clientLocation is applied to a templated parameter that is instantiated with different types. Move the parameter on each operation instead, so that it has a consistent type on the client.`,
      },
    },
    "client-location-wrong-type": {
      docs: fileRef.fromPackageRoot("src/diagnostics/client-location-wrong-type.md"),
      severity: "warning",
      messages: {
        default:
          "`@clientLocation` could only move operation to the interface or namespace belong to the root namespace with `@service`.",
      },
    },
    "legacy-hierarchy-building-conflict": {
      docs: fileRef.fromPackageRoot("src/diagnostics/legacy-hierarchy-building-conflict.md"),
      severity: "warning",
      messages: {
        "property-type-mismatch": paramMessage`@hierarchyBuilding decorator: property '${"propertyName"}' on model '${"childModel"}' has type that does not match the same-named property supplied by the new base chain (rooted at '${"parentModel"}'). The property is dropped from '${"childModel"}' to satisfy the rebase rule (own properties are filtered against the new base chain by name). Consider aligning the types or removing the property from '${"childModel"}'.`,
      },
    },
    "legacy-hierarchy-building-circular-reference": {
      docs: fileRef.fromPackageRoot(
        "src/diagnostics/legacy-hierarchy-building-circular-reference.md",
      ),
      severity: "error",
      messages: {
        default: "@hierarchyBuilding decorator causes recursive base type reference.",
      },
    },
    "missing-scope": {
      docs: fileRef.fromPackageRoot("src/diagnostics/missing-scope.md"),
      severity: "warning",
      messages: {
        default: paramMessage`@scope decorator should be applied with ${"decoratorName"} since it is highly likely this is language-specific`,
      },
    },
    "required-parameter-scoped-out": {
      docs: fileRef.fromPackageRoot("src/diagnostics/required-parameter-scoped-out.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Required parameter "${"paramName"}" is scoped out for emitter "${"scope"}". This may cause runtime errors unless the parameter is provided through other means (e.g., custom headers).`,
      },
    },
    "external-library-version-mismatch": {
      docs: fileRef.fromPackageRoot("src/diagnostics/external-library-version-mismatch.md"),
      severity: "warning",
      messages: {
        default: paramMessage`External library version mismatch. There are multiple versions of ${"libraryName"}: ${"versionA"} and ${"versionB"}. Please unify the versions.`,
      },
    },
    "external-type-on-model-property": {
      docs: fileRef.fromPackageRoot("src/diagnostics/external-type-on-model-property.md"),
      severity: "warning",
      messages: {
        default: `@alternateType with external type information cannot be applied to model properties. Please apply it to the type definition itself (Scalar, Model, Enum, or Union) instead.`,
      },
    },
    "invalid-mark-as-lro-target": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-mark-as-lro-target.md"),
      severity: "warning",
      messages: {
        default: paramMessage`@markAsLro decorator can only be applied to operations that return a model. We will ignore this decorator.`,
      },
    },
    "mark-as-lro-ineffective": {
      docs: fileRef.fromPackageRoot("src/diagnostics/mark-as-lro-ineffective.md"),
      severity: "warning",
      messages: {
        default: paramMessage`@markAsLro decorator is ineffective since this operation already returns real LRO metadata. Please remove the @markAsLro decorator.`,
      },
    },
    "invalid-mark-as-pageable-target": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-mark-as-pageable-target.md"),
      severity: "warning",
      messages: {
        default: paramMessage`@markAsPageable decorator can only be applied to operations that return a model with a property decorated with @pageItems or a property named 'value'. We will ignore this decorator.`,
      },
    },
    "mark-as-pageable-ineffective": {
      docs: fileRef.fromPackageRoot("src/diagnostics/mark-as-pageable-ineffective.md"),
      severity: "warning",
      messages: {
        default: paramMessage`@markAsPageable decorator is ineffective since this operation is already marked as pageable with @list decorator. Please remove the @markAsPageable decorator.`,
      },
    },
    "api-version-undefined": {
      docs: fileRef.fromPackageRoot("src/diagnostics/api-version-undefined.md"),
      severity: "warning",
      messages: {
        default: paramMessage`The API version specified in the config: "${"version"}" is not defined in service versioning list. Fall back to the latest version.`,
      },
    },
    "root-client-missing-service": {
      docs: fileRef.fromPackageRoot("src/diagnostics/root-client-missing-service.md"),
      severity: "error",
      messages: {
        default: "Root namespace decorated with @client must have service config.",
      },
    },
    "invalid-client-service-multiple": {
      docs: fileRef.fromPackageRoot("src/diagnostics/invalid-client-service-multiple.md"),
      severity: "error",
      messages: {
        default: "`@client` with multiple services is only allowed on `Namespace`.",
      },
    },
    "inconsistent-multiple-service": {
      docs: fileRef.fromPackageRoot("src/diagnostics/inconsistent-multiple-service.md"),
      severity: "error",
      messages: {
        default: "All services must have the same server and auth definitions.",
      },
    },
    "inconsistent-multiple-service-dependency": {
      docs: fileRef.fromPackageRoot("src/diagnostics/inconsistent-multiple-service-dependency.md"),
      severity: "warning",
      messages: {
        default: paramMessage`Services merged into client "${"clientName"}" depend on different versions of "${"dependencyName"}": ${"versions"}.`,
      },
    },
    "client-option": {
      docs: fileRef.fromPackageRoot("src/diagnostics/client-option.md"),
      severity: "warning",
      messages: {
        default:
          "@clientOption is experimental and should only be used for temporary workarounds. This usage must be suppressed.",
      },
    },
    "client-option-requires-scope": {
      docs: fileRef.fromPackageRoot("src/diagnostics/client-option-requires-scope.md"),
      severity: "warning",
      messages: {
        default:
          "@clientOption should be applied with a specific language scope since it is highly likely this is language-specific.",
      },
    },
    "replace-parameter-not-found": {
      docs: fileRef.fromPackageRoot("src/diagnostics/replace-parameter-not-found.md"),
      severity: "error",
      messages: {
        default: paramMessage`Parameter "${"paramName"}" not found in operation "${"operationName"}".`,
      },
    },
    "reorder-parameter-not-found": {
      docs: fileRef.fromPackageRoot("src/diagnostics/reorder-parameter-not-found.md"),
      severity: "error",
      messages: {
        default: paramMessage`Parameter "${"paramName"}" specified in reorder list not found in operation "${"operationName"}".`,
      },
    },
    "reorder-parameter-missing": {
      docs: fileRef.fromPackageRoot("src/diagnostics/reorder-parameter-missing.md"),
      severity: "error",
      messages: {
        default: paramMessage`Parameter "${"paramName"}" from operation "${"operationName"}" is missing in reorder list.`,
      },
    },
    "add-parameter-duplicate": {
      docs: fileRef.fromPackageRoot("src/diagnostics/add-parameter-duplicate.md"),
      severity: "error",
      messages: {
        default: paramMessage`Parameter "${"paramName"}" already exists in operation "${"operationName"}".`,
      },
    },
    "reorder-parameter-duplicate": {
      docs: fileRef.fromPackageRoot("src/diagnostics/reorder-parameter-duplicate.md"),
      severity: "error",
      messages: {
        default: paramMessage`Parameter "${"paramName"}" appears more than once in the reorder list for operation "${"operationName"}".`,
      },
    },
    "remove-parameter-not-found": {
      docs: fileRef.fromPackageRoot("src/diagnostics/remove-parameter-not-found.md"),
      severity: "error",
      messages: {
        default: paramMessage`Parameter "${"paramName"}" not found in operation "${"operationName"}".`,
      },
    },
    "nested-client-service-not-subset": {
      docs: fileRef.fromPackageRoot("src/diagnostics/nested-client-service-not-subset.md"),
      severity: "error",
      messages: {
        default:
          "Nested client's services must be a subset of the parent client's services. If no service is needed, omit the `service` property to inherit from the parent.",
      },
    },
    "auto-merge-service-conflict": {
      docs: fileRef.fromPackageRoot("src/diagnostics/auto-merge-service-conflict.md"),
      severity: "error",
      messages: {
        default: "Auto-merging service client must be empty.",
      },
    },
  },
  emitter: {
    options: TCGCEmitterOptionsSchema,
  },
});

const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;

export { createDiagnostic, createStateSymbol, reportDiagnostic };
