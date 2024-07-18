/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import {
  $omitKeyProperties,
  $requestParameter,
  $responseProperty,
} from "@azure-tools/typespec-azure-core";
import type {
  OmitKeyPropertiesDecorator,
  RequestParameterDecorator,
  ResponsePropertyDecorator,
} from "./Azure.Core.Foundations.js";

type Decorators = {
  $omitKeyProperties: OmitKeyPropertiesDecorator;
  $requestParameter: RequestParameterDecorator;
  $responseProperty: ResponsePropertyDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $omitKeyProperties,
  $requestParameter,
  $responseProperty,
};
