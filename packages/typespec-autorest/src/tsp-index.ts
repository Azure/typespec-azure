import { AutorestDecorators } from "../generated-defs/Autorest.js";
import { $example, $useRef } from "./decorators.js";

export { $lib } from "./lib.js";

export const $decorators = {
  Autorest: {
    example: $example,
    useRef: $useRef,
  } satisfies AutorestDecorators,
};
