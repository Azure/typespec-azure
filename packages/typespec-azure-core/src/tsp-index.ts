import { AzureCoreFoundationsDecorators } from "../generated-defs/Azure.Core.Foundations.js";
import { AzureCoreFoundationsPrivateDecorators } from "../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreDecorators } from "../generated-defs/Azure.Core.js";
import { AzureCoreTraitsDecorators } from "../generated-defs/Azure.Core.Traits.js";
import { AzureCoreTraitsPrivateDecorators } from "../generated-defs/Azure.Core.Traits.Private.js";
import {
  $finalLocation,
  $finalOperation,
  $items,
  $nextPageOperation,
  $omitKeyProperties,
  $operationLink,
  $pagedResult,
  $pollingLocation,
  $pollingOperation,
  $pollingOperationParameter,
  $requestParameter,
  $responseProperty,
  $spreadCustomParameters,
  $spreadCustomResponseProperties,
} from "./decorators.js";
import { $lroCanceled } from "./decorators/lro-cancelled.js";
import { $lroErrorResult } from "./decorators/lro-error-result.js";
import { $lroFailed } from "./decorators/lro-failed.js";
import { $lroResult } from "./decorators/lro-result.js";
import { $lroStatus } from "./decorators/lro-status.js";
import { $lroSucceeded } from "./decorators/lro-succeeded.js";
import { $previewVersion } from "./decorators/preview-version.js";
import { $armResourceIdentifierConfig } from "./decorators/private/arm-resource-identifier-config.js";
import { $defaultFinalStateVia } from "./decorators/private/default-final-state-via.js";
import { $embeddingVector } from "./decorators/private/embedding-vector.js";
import { $ensureResourceType } from "./decorators/private/ensure-resource-type.js";
import { $ensureVerb } from "./decorators/private/ensure-verb.js";
import { $needsRoute } from "./decorators/private/needs-route.js";
import { parameterizedNextLinkConfigDecorator } from "./decorators/private/parameterized-next-link-config.js";
import { $useFinalStateVia } from "./decorators/use-final-state-via.js";
import {
  $addTraitProperties,
  $applyTraitOverride,
  $ensureAllHeaderParams,
  $ensureAllQueryParams,
  $ensureTraitsPresent,
  $trait,
  $traitAdded,
  $traitContext,
  $traitLocation,
  $traitSource,
} from "./traits.js";

export { $lib } from "./lib.js";
export { $onValidate } from "./validate.js";

/** @internal */
export const $decorators = {
  "Azure.Core": {
    lroStatus: $lroStatus,
    finalLocation: $finalLocation,
    pollingLocation: $pollingLocation,
    pagedResult: $pagedResult,
    items: $items,
    lroSucceeded: $lroSucceeded,
    lroCanceled: $lroCanceled,
    lroFailed: $lroFailed,
    lroResult: $lroResult,
    lroErrorResult: $lroErrorResult,
    operationLink: $operationLink,
    pollingOperationParameter: $pollingOperationParameter,
    pollingOperation: $pollingOperation,
    previewVersion: $previewVersion,
    finalOperation: $finalOperation,
    useFinalStateVia: $useFinalStateVia,
    nextPageOperation: $nextPageOperation,
  } satisfies AzureCoreDecorators,

  "Azure.Core.Foundations": {
    omitKeyProperties: $omitKeyProperties,
    requestParameter: $requestParameter,
    responseProperty: $responseProperty,
  } satisfies AzureCoreFoundationsDecorators,
  "Azure.Core.Foundations.Private": {
    spreadCustomParameters: $spreadCustomParameters,
    spreadCustomResponseProperties: $spreadCustomResponseProperties,
    ensureResourceType: $ensureResourceType,
    embeddingVector: $embeddingVector,
    armResourceIdentifierConfig: $armResourceIdentifierConfig,
    needsRoute: $needsRoute,
    ensureVerb: $ensureVerb,
    defaultFinalStateVia: $defaultFinalStateVia,
    parameterizedNextLinkConfig: parameterizedNextLinkConfigDecorator,
  } satisfies AzureCoreFoundationsPrivateDecorators,

  "Azure.Core.Traits": {
    trait: $trait,
    traitAdded: $traitAdded,
    traitContext: $traitContext,
    traitLocation: $traitLocation,
  } satisfies AzureCoreTraitsDecorators,

  "Azure.Core.Traits.Private": {
    applyTraitOverride: $applyTraitOverride,
    ensureAllQueryParams: $ensureAllQueryParams,
    ensureAllHeaderParams: $ensureAllHeaderParams,
    addTraitProperties: $addTraitProperties,
    traitSource: $traitSource,
    ensureTraitsPresent: $ensureTraitsPresent,
  } satisfies AzureCoreTraitsPrivateDecorators,
};
