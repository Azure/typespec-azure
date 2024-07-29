/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import { $example, $useRef } from "@azure-tools/typespec-autorest";
import type { ExampleDecorator, UseRefDecorator } from "./Autorest.js";

type Decorators = {
  $example: ExampleDecorator;
  $useRef: UseRefDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $example,
  $useRef,
};
