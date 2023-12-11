import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";
import { armCommonTypesVersionRule } from "./rules/arm-common-types-version.js";
import { armResourceActionNoSegmentRule } from "./rules/arm-resource-action-no-segment.js";
import { armResourceDuplicatePropertiesRule } from "./rules/arm-resource-duplicate-property.js";
import { interfacesRule } from "./rules/arm-resource-interfaces.js";
import { invalidActionVerbRule } from "./rules/arm-resource-invalid-action-verb.js";
import { armResourceEnvelopeProperties } from "./rules/arm-resource-invalid-envelope-property.js";
import { armResourceInvalidVersionFormatRule } from "./rules/arm-resource-invalid-version-format.js";
import { armResourceKeyInvalidCharsRule } from "./rules/arm-resource-key-invalid-chars.js";
import { armResourceOperationsRule } from "./rules/arm-resource-operation-response.js";
import { patchOperationsRule } from "./rules/arm-resource-patch.js";
import { armResourcePathInvalidCharsRule } from "./rules/arm-resource-path-invalid-chars.js";
import { armResourceProvisioningStateRule } from "./rules/arm-resource-provisioning-state-rule.js";
import { beyondNestingRule } from "./rules/beyond-nesting-levels.js";
import { coreOperationsRule } from "./rules/core-operations.js";
import { deleteOperationMissingRule } from "./rules/delete-operation.js";
import { envelopePropertiesRules } from "./rules/envelope-properties.js";
import { listBySubscriptionRule } from "./rules/list-operation.js";
import { noResponseBodyRule } from "./rules/no-response-body.js";
import { operationsInterfaceMissingRule } from "./rules/operations-interface-missing.js";
import { patchEnvelopePropertiesRules } from "./rules/patch-envelope-properties.js";
import { resourceNameRule } from "./rules/resource-name.js";
import { retryAfterRule } from "./rules/retry-after.js";
import { unsupportedTypeRule } from "./rules/unsupported-type.js";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azure-resource-manager",
  diagnostics: {
    "single-arm-provider": {
      severity: "error",
      messages: {
        default: "Only one @armProviderNamespace can be declared in a typespec spec at once.",
      },
    },
    "decorator-param-wrong-type": {
      severity: "error",
      messages: {
        armUpdateProviderNamespace:
          "The parameter to @armUpdateProviderNamespace must be an operation with a 'provider' parameter.",
      },
    },
    "arm-resource-circular-ancestry": {
      severity: "warning",
      messages: {
        default:
          "There is a loop in the ancestry of this resource.  Please ensure that the `@parentResource` decorator contains the correct parent resource, and that parentage contains no cycles.",
      },
    },
    "arm-resource-duplicate-base-parameter": {
      severity: "warning",
      messages: {
        default:
          "Only one base parameter type is allowed per resource.  Each resource may have only one of `@parentResource`, `@resourceGroupResource`, `@tenantResource`, `@locationResource`, or `@subscriptionResource` decorators.",
      },
    },
    "arm-resource-missing-name-property": {
      severity: "error",
      messages: {
        default: "Resource types must include a string property called 'name'.",
      },
    },
    "arm-resource-missing-name-key-decorator": {
      severity: "error",
      messages: {
        default:
          "Resource type 'name' property must have a @key decorator which defines its key name.",
      },
    },
    "arm-resource-missing-name-segment-decorator": {
      severity: "error",
      messages: {
        default:
          "Resource type 'name' property must have a @segment decorator which defines its path fragment.",
      },
    },
    "arm-resource-missing-arm-namespace": {
      severity: "error",
      messages: {
        default:
          "The @armProviderNamespace decorator must be used to define the ARM namespace of the service.  This is best applied to the file-level namespace.",
      },
    },
    "arm-resource-invalid-base-type": {
      severity: "error",
      messages: {
        default:
          "The @armResourceInternal decorator can only be used on a type that ultimately extends TrackedResource, ProxyResource, or ExtensionResource.",
      },
    },
    "arm-resource-missing": {
      severity: "error",
      messages: {
        default: paramMessage`No @armResource registration found for type ${"type"}`,
      },
    },
    "arm-common-types-incompatible-version": {
      severity: "warning",
      messages: {
        default: paramMessage`No ARM common-types version for this type satisfies the expected version ${"selectedVersion"}.  This type only supports the following version(s): ${"supportedVersions"}`,
      },
    },
    "decorator-in-namespace": {
      severity: "error",
      messages: {
        default: paramMessage`The @${"decoratorName"} decorator can only be applied to an operation that is defined inside of a namespace.`,
      },
    },
    "parent-type": {
      severity: "error",
      messages: {
        notResourceType: paramMessage`Parent type ${"parent"} of ${"type"} is not registered as an ARM resource type.`,
      },
    },
  },
  linter: {
    rules: [
      armResourceActionNoSegmentRule,
      armResourceDuplicatePropertiesRule,
      interfacesRule,
      invalidActionVerbRule,
      armResourceEnvelopeProperties,
      armResourceInvalidVersionFormatRule,
      armResourceKeyInvalidCharsRule,
      armResourceOperationsRule,
      patchOperationsRule,
      armResourcePathInvalidCharsRule,
      armResourceProvisioningStateRule,
      armCommonTypesVersionRule,
      beyondNestingRule,
      coreOperationsRule,
      deleteOperationMissingRule,
      envelopePropertiesRules,
      listBySubscriptionRule,
      noResponseBodyRule,
      operationsInterfaceMissingRule,
      patchEnvelopePropertiesRules,
      resourceNameRule,
      retryAfterRule,
      unsupportedTypeRule,
    ],
    ruleSets: {
      all: {
        enable: {
          [`@azure-tools/typespec-azure-resource-manager/${armResourceActionNoSegmentRule.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourceDuplicatePropertiesRule.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${interfacesRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${invalidActionVerbRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourceEnvelopeProperties.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourceInvalidVersionFormatRule.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourceKeyInvalidCharsRule.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourceOperationsRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${patchOperationsRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourcePathInvalidCharsRule.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${armResourceProvisioningStateRule.name}`]:
            true,
          // TODO: Enable this rule once azure-rest-api-specs repo is ready (issue #3839)
          [`@azure-tools/typespec-azure-resource-manager/${armCommonTypesVersionRule.name}`]: false,
          [`@azure-tools/typespec-azure-resource-manager/${beyondNestingRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${coreOperationsRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${deleteOperationMissingRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${envelopePropertiesRules.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${listBySubscriptionRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${noResponseBodyRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${operationsInterfaceMissingRule.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${patchEnvelopePropertiesRules.name}`]:
            true,
          [`@azure-tools/typespec-azure-resource-manager/${resourceNameRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${retryAfterRule.name}`]: true,
          [`@azure-tools/typespec-azure-resource-manager/${unsupportedTypeRule.name}`]: true,
        },
        extends: ["@azure-tools/typespec-azure-core/all"],
      },
    },
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
