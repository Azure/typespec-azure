import { defineLinter } from "@typespec/compiler";
import { armCommonTypesVersionRule } from "./rules/arm-common-types-version.js";
import { armNoRecordRule } from "./rules/arm-no-record.js";
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
import { missingXmsIdentifiersRule } from "./rules/missing-x-ms-identifiers.js";
import { noResponseBodyRule } from "./rules/no-response-body.js";
import { operationsInterfaceMissingRule } from "./rules/operations-interface-missing.js";
import { patchEnvelopePropertiesRules } from "./rules/patch-envelope-properties.js";
import { resourceNameRule } from "./rules/resource-name.js";
import { retryAfterRule } from "./rules/retry-after.js";
import { unsupportedTypeRule } from "./rules/unsupported-type.js";

const rules = [
  armNoRecordRule,
  armCommonTypesVersionRule,
  armResourceActionNoSegmentRule,
  armResourceDuplicatePropertiesRule,
  armResourceEnvelopeProperties,
  armResourceInvalidVersionFormatRule,
  armResourceKeyInvalidCharsRule,
  armResourceOperationsRule,
  armResourcePathInvalidCharsRule,
  armResourceProvisioningStateRule,
  beyondNestingRule,
  coreOperationsRule,
  deleteOperationMissingRule,
  envelopePropertiesRules,
  interfacesRule,
  invalidActionVerbRule,
  listBySubscriptionRule,
  missingXmsIdentifiersRule,
  noResponseBodyRule,
  operationsInterfaceMissingRule,
  patchEnvelopePropertiesRules,
  patchOperationsRule,
  resourceNameRule,
  retryAfterRule,
  unsupportedTypeRule,
];

const allRulesEnabled = Object.fromEntries(
  rules.map((rule) => [`@azure-tools/typespec-azure-resource-manager/${rule.name}`, true])
);

export const $linter = defineLinter({
  rules,
  ruleSets: {
    all: {
      extends: [
        "@azure-tools/typespec-azure-core/all",
        "@azure-tools/typespec-azure-core/canonical-versioning",
      ],
      enable: {
        ...allRulesEnabled,
        // TODO: Enable this rule once azure-rest-api-specs repo is ready (issue #3839)
        [`@azure-tools/typespec-azure-resource-manager/${armCommonTypesVersionRule.name}`]: false,
      },
      disable: {
        [`@azure-tools/typespec-azure-core/bad-record-type`]:
          "This clashes with the ARM `no-record` rule.",
      },
    },
  },
});
