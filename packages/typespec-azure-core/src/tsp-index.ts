import { AzureCoreFoundationsDecorators } from "../generated-defs/Azure.Core.Foundations.js";
import { AzureCoreFoundationsPrivateDecorators } from "../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreDecorators } from "../generated-defs/Azure.Core.js";
import { AzureCoreTraitsDecorators } from "../generated-defs/Azure.Core.Traits.js";
import { AzureCoreTraitsPrivateDecorators } from "../generated-defs/Azure.Core.Traits.Private.js";
import {
  $armResourceIdentifierConfig,
  $defaultFinalStateVia,
  $embeddingVector,
  $ensureResourceType,
  $ensureVerb,
  $finalLocation,
  $finalOperation,
  $fixed,
  $items,
  $lroCanceled,
  $lroErrorResult,
  $lroFailed,
  $lroResult,
  $lroStatus,
  $lroSucceeded,
  $needsRoute,
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
  $useFinalStateVia,
  parameterizedNextLinkConfigDecorator,
} from "./decorators.js";
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
    fixed: $fixed,
    lroSucceeded: $lroSucceeded,
    lroCanceled: $lroCanceled,
    lroFailed: $lroFailed,
    lroResult: $lroResult,
    lroErrorResult: $lroErrorResult,
    operationLink: $operationLink,
    pollingOperationParameter: $pollingOperationParameter,
    pollingOperation: $pollingOperation,
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
