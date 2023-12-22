import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";
import { apiVersionRule } from "./rules/api-version-parameter.js";
import { authRequiredRule } from "./rules/auth-required.js";
import { byosRule } from "./rules/byos.js";
import { casingRule } from "./rules/casing.js";
import { compositionOverInheritanceRule } from "./rules/composition-over-inheritance.js";
import { extensibleEnumRule } from "./rules/extensible-enums.js";
import { friendlyNameRule } from "./rules/friendly-name.js";
import { knownEncodingRule } from "./rules/known-encoding.js";
import { longRunningOperationsRequirePollingOperation } from "./rules/lro-polling-operation.js";
import { noClosedLiteralUnionRule } from "./rules/no-closed-literal-union.js";
import { noEnumRule } from "./rules/no-enum.js";
import { noErrorStatusCodesRule } from "./rules/no-error-status-codes.js";
import { noExplicitRoutesResourceOps } from "./rules/no-explicit-routes-resource-ops.js";
import { noFixedEnumDiscriminatorRule } from "./rules/no-fixed-enum-discriminator.js";
import { noNullableRule } from "./rules/no-nullable.js";
import { noOffsetDateTimeRule } from "./rules/no-offsetdatetime.js";
import { operationIdRule } from "./rules/no-operation-id.js";
import { noResponseBodyRule } from "./rules/no-response-body.js";
import { noRpcPathParamsRule } from "./rules/no-rpc-path-params.js";
import { preferCsvCollectionFormatRule } from "./rules/prefer-csv-collection-format.js";
import { preventFormatUse } from "./rules/prevent-format.js";
import { preventMultipleDiscriminator } from "./rules/prevent-multiple-discriminator.js";
import { preventRestLibraryInterfaces } from "./rules/prevent-rest-library.js";
import { preventUnknownType } from "./rules/prevent-unknown.js";
import { propertyNameRule } from "./rules/property-naming.js";
import { recordTypeRule } from "./rules/record-types.js";
import { bodyArrayRule } from "./rules/request-body-array.js";
import { requireDocumentation } from "./rules/require-docs.js";
import { requireKeyVisibility } from "./rules/require-key-visibility.js";
import { responseSchemaMultiStatusCodeRule } from "./rules/response-schema-multi-status-code.js";
import { rpcOperationRequestBodyRule } from "./rules/rpc-operation-request-body.js";
import { spreadDiscriminatedModelRule } from "./rules/spread-discriminated-model.js";
import { useStandardNames } from "./rules/use-standard-names.js";
import { useStandardOperations } from "./rules/use-standard-ops.js";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azure-core",
  diagnostics: {
    "lro-status-union-non-string": {
      severity: "error",
      messages: {
        default: paramMessage`Union contains non-string value type ${"type"}.`,
      },
    },
    "lro-status-property-invalid-type": {
      severity: "error",
      messages: {
        default: "Property type must be a union of strings or an enum.",
      },
    },
    "lro-status-missing": {
      severity: "error",
      messages: {
        default: paramMessage`Terminal long-running operation states are missing: ${"states"}.`,
      },
    },
    "lro-status-monitor-invalid-result-property": {
      severity: "warning",
      messages: {
        default: paramMessage`StatusMonitor has more than one ${"resultType"} property marked with '${"decorator"}'.  Ensure that only one property in the model is marked with this decorator.`,
      },
    },
    "bad-record-type": {
      severity: "warning",
      messages: {
        extendUnknown: paramMessage`${"name"} should not use '${"keyword"} Record<${"typeName"}>'. Use '${"keyword"} Record<string>' instead.`,
        recordWithProperties: paramMessage`${"name"} that uses '${"keyword"} Record<${"typeName"}>' should not have properties.`,
      },
    },
    "request-parameter-invalid": {
      severity: "error",
      messages: {
        default: paramMessage`Request parameter '${"name"}' not found on request body model.`,
      },
    },
    "response-property-invalid": {
      severity: "error",
      messages: {
        default: paramMessage`Response property '${"name"}' not found on success response model.`,
      },
    },
    "operation-link-parameter-invalid": {
      severity: "error",
      messages: {
        default: "Parameters must be of template type RequestParameter<T> or ResponseProperty<T>.",
      },
    },
    "operation-link-parameter-invalid-target": {
      severity: "error",
      messages: {
        default: paramMessage`Request parameter '${"name"}' not found in linked operation.`,
      },
    },
    "invalid-resource-type": {
      severity: "error",
      messages: {
        missingKey: paramMessage`Model type '${"name"}' is not a valid resource type.  It must contain a property decorated with '@key'.`,
        missingSegment: paramMessage`Model type '${"name"}' is not a valid resource type.  It must be decorated with the '@resource' decorator.`,
      },
    },
    "polling-operation-return-model": {
      severity: "error",
      messages: {
        default:
          "An operation annotated with @pollingOperation must return a model or union of model.",
      },
    },
    "polling-operation-no-status-monitor": {
      severity: "warning",
      messages: {
        default:
          "The operation linked in  @pollingOperation must return a valid status monitor.  The status monitor model must contain a 'status' property, or a property decorated with  '@lroStatus'.  The status field must be of Enum or Union type and contain terminal status values for success and failure.",
      },
    },
    "polling-operation-no-lro-success": {
      severity: "warning",
      messages: {
        default:
          "The status monitor returned from the polling operation must have a status property, with a known status value the indicates successful completion. This known value may be named 'Succeeded' or marked with the '@lroSucceeded' decorator.",
      },
    },
    "polling-operation-no-lro-failure": {
      severity: "warning",
      messages: {
        default:
          "The status monitor returned from the polling operation must have a status property, with a known status value the indicates failure. This known value may be named 'Failed' or marked with the '@lroFailed' decorator.",
      },
    },
    "polling-operation-no-ref-or-link": {
      severity: "warning",
      messages: {
        default:
          "An operation decorated with '@pollingOperation' must either return a response with an 'Operation-Location' header that will contain a runtime link to the polling operation, or specify parameters and return type properties to map into the polling operation parameters.  A map into polling operation parameters can be created using the '@pollingOperationParameter' decorator",
      },
    },
    "invalid-final-operation": {
      severity: "warning",
      messages: {
        default:
          "The operation linked in the '@finalOperation' decorator must have a 200 response that includes a model.",
      },
    },
    "invalid-trait-property-count": {
      severity: "error",
      messages: {
        default: paramMessage`Trait type '${"modelName"}' is not a valid trait type.  It must contain exactly one property that maps to a model type.`,
      },
    },
    "invalid-trait-property-type": {
      severity: "error",
      messages: {
        default: paramMessage`Trait type '${"modelName"}' has an invalid envelope property type.  The property '${"propertyName"}' must be a model type.`,
      },
    },
    "invalid-trait-context": {
      severity: "error",
      messages: {
        default:
          "The trait context can only be an enum member, union of enum members, or `unknown`.",
      },
    },
    "trait-property-without-location": {
      severity: "error",
      messages: {
        default: paramMessage`Trait type '${"modelName"}' contains property '${"propertyName"}' which does not have a @traitLocation decorator.`,
      },
    },
    "expected-trait-missing": {
      severity: "error",
      messages: {
        default: paramMessage`Expected trait '${"trait"}' is missing. ${"message"}`,
      },
    },
    "client-request-id-trait-missing": {
      severity: "warning",
      messages: {
        default: paramMessage`The ClientRequestId trait is required for the ResourceOperations interface.  Include either SupportsClientRequestId or NoClientRequestId in the traits model for your interface declaration.`,
      },
    },
    "repeatable-requests-trait-missing": {
      severity: "warning",
      messages: {
        default: paramMessage`The RepeatableRequests trait is required for the ResourceOperations interface.  Include either SupportsRepeatableRequests or NoRepeatableRequests in the traits model for your interface declaration.`,
      },
    },
    "conditional-requests-trait-missing": {
      severity: "warning",
      messages: {
        default: paramMessage`The ConditionalRequests trait is required for the ResourceOperations interface.  Include either SupportsConditionalRequests or NoConditionalRequests in the traits model for your interface declaration.`,
      },
    },
    "expected-trait-diagnostic-missing": {
      severity: "error",
      messages: {
        default: `Expected trait entries must have a "diagnostic" field with a valid diagnostic code for the missing trait.`,
      },
    },
    "invalid-parameter": {
      severity: "error",
      messages: {
        default: paramMessage`Expected property '${"propertyName"}' to be a ${"kind"} parameter.`,
      },
    },
    "expected-success-response": {
      severity: "error",
      messages: {
        default: "The operation must have a success response",
      },
    },
    "lro-polling-data-missing-from-operation-response": {
      severity: "error",
      messages: {
        default: "At least one operation response must contain a field marked with `@lroStatus`",
      },
    },
    "no-object": {
      severity: "warning",
      messages: {
        default:
          "Don't use 'object'.\n - If you want an object with any properties, use `Record<unknown>`\n - If you meant anything, use `unknown`.",
      },
    },
    "verb-conflict": {
      severity: "warning",
      messages: {
        default: paramMessage`Operation template '${"templateName"}' requires HTTP verb '${"requiredVerb"}' but found '${"verb"}'.`,
      },
    },
    "rpc-operation-needs-route": {
      severity: "warning",
      messages: {
        default: "The operation needs a @route",
      },
    },
    "union-enums-multiple-kind": {
      severity: "warning",
      messages: {
        default: paramMessage`Couldn't resolve the kind of the union as it has multiple types: ${"kinds"}`,
      },
    },
    "union-enums-invalid-kind": {
      severity: "warning",
      messages: {
        default: paramMessage`Kind ${"kind"} prevents this union from being resolved as an enum.`,
      },
    },
    "union-enums-circular": {
      severity: "warning",
      messages: {
        default: `Union is referencing itself and cannot be resolved as an enum.`,
      },
    },
  },
  linter: {
    rules: [
      apiVersionRule,
      authRequiredRule,
      operationIdRule,
      bodyArrayRule,
      byosRule,
      casingRule,
      spreadDiscriminatedModelRule,
      compositionOverInheritanceRule,
      preferCsvCollectionFormatRule,
      extensibleEnumRule,
      knownEncodingRule,
      useStandardOperations,
      noClosedLiteralUnionRule,
      noEnumRule,
      noErrorStatusCodesRule,
      noFixedEnumDiscriminatorRule,
      noNullableRule,
      noOffsetDateTimeRule,
      noRpcPathParamsRule,
      noExplicitRoutesResourceOps,
      noResponseBodyRule,
      preventFormatUse,
      preventMultipleDiscriminator,
      preventRestLibraryInterfaces,
      preventUnknownType,
      recordTypeRule,
      responseSchemaMultiStatusCodeRule,
      propertyNameRule,
      rpcOperationRequestBodyRule,
      requireDocumentation,
      requireKeyVisibility,
      longRunningOperationsRequirePollingOperation,
      useStandardNames,
    ],
    ruleSets: {
      all: {
        enable: {
          [`@azure-tools/typespec-azure-core/${apiVersionRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${authRequiredRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${operationIdRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${bodyArrayRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${byosRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${casingRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${compositionOverInheritanceRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${spreadDiscriminatedModelRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${preferCsvCollectionFormatRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${extensibleEnumRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${knownEncodingRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${useStandardOperations.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noErrorStatusCodesRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noFixedEnumDiscriminatorRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noNullableRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noOffsetDateTimeRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noRpcPathParamsRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noExplicitRoutesResourceOps.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noResponseBodyRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${preventFormatUse.name}`]: true,
          [`@azure-tools/typespec-azure-core/${preventMultipleDiscriminator.name}`]: true,
          [`@azure-tools/typespec-azure-core/${preventRestLibraryInterfaces.name}`]: true,
          [`@azure-tools/typespec-azure-core/${preventUnknownType.name}`]: true,
          [`@azure-tools/typespec-azure-core/${recordTypeRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${responseSchemaMultiStatusCodeRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${propertyNameRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${rpcOperationRequestBodyRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${requireDocumentation.name}`]: true,
          [`@azure-tools/typespec-azure-core/${requireKeyVisibility.name}`]: true,
          [`@azure-tools/typespec-azure-core/${longRunningOperationsRequirePollingOperation.name}`]:
            true,
          [`@azure-tools/typespec-azure-core/${useStandardNames.name}`]: true,
          [`@azure-tools/typespec-azure-core/${friendlyNameRule.name}`]: true,
          [`@azure-tools/typespec-azure-core/${noEnumRule.name}`]: false,
        },
        extends: ["@typespec/http/all"],
      },
    },
  },
});

export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
