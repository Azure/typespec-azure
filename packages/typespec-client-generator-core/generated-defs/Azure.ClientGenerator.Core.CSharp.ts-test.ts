/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import { $hasJsonConverter } from "@azure-tools/typespec-client-generator-core";
import type { HasJsonConverterDecorator } from "./Azure.ClientGenerator.Core.CSharp.js";

type Decorators = {
  $hasJsonConverter: HasJsonConverterDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $hasJsonConverter,
};
