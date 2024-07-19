/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import {
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
  $nextLink,
  $nextPageOperation,
  $operationLink,
  $pagedResult,
  $pollingLocation,
  $pollingOperation,
  $pollingOperationParameter,
  $useFinalStateVia,
} from "@azure-tools/typespec-azure-core";
import type {
  FinalLocationDecorator,
  FinalOperationDecorator,
  FixedDecorator,
  ItemsDecorator,
  LroCanceledDecorator,
  LroErrorResultDecorator,
  LroFailedDecorator,
  LroResultDecorator,
  LroStatusDecorator,
  LroSucceededDecorator,
  NextLinkDecorator,
  NextPageOperationDecorator,
  OperationLinkDecorator,
  PagedResultDecorator,
  PollingLocationDecorator,
  PollingOperationDecorator,
  PollingOperationParameterDecorator,
  UseFinalStateViaDecorator,
} from "./Azure.Core.js";

type Decorators = {
  $lroStatus: LroStatusDecorator;
  $finalLocation: FinalLocationDecorator;
  $pollingLocation: PollingLocationDecorator;
  $pagedResult: PagedResultDecorator;
  $items: ItemsDecorator;
  $nextLink: NextLinkDecorator;
  $fixed: FixedDecorator;
  $lroSucceeded: LroSucceededDecorator;
  $lroCanceled: LroCanceledDecorator;
  $lroFailed: LroFailedDecorator;
  $lroResult: LroResultDecorator;
  $lroErrorResult: LroErrorResultDecorator;
  $operationLink: OperationLinkDecorator;
  $pollingOperationParameter: PollingOperationParameterDecorator;
  $pollingOperation: PollingOperationDecorator;
  $finalOperation: FinalOperationDecorator;
  $useFinalStateVia: UseFinalStateViaDecorator;
  $nextPageOperation: NextPageOperationDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $lroStatus,
  $finalLocation,
  $pollingLocation,
  $pagedResult,
  $items,
  $nextLink,
  $fixed,
  $lroSucceeded,
  $lroCanceled,
  $lroFailed,
  $lroResult,
  $lroErrorResult,
  $operationLink,
  $pollingOperationParameter,
  $pollingOperation,
  $finalOperation,
  $useFinalStateVia,
  $nextPageOperation,
};
