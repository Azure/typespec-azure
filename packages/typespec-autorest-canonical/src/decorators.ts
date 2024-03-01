import { DecoratorContext, Model, ModelProperty, Program, Service, Type } from "@typespec/compiler";
import { createStateSymbol } from "./lib.js";

export const namespace = "Autorestcanonical";

/**
 * Parameters that may be passed to a RefProducer function.  Specific RefProducer
 * functions may define additional parameters.
 */
export interface RefProducerParams {
  service?: Service;
  version?: string;
}

/**
 * A function that can produce a ref path at the time it is requested.
 */
export type RefProducer = (
  program: Program,
  entity: Model | ModelProperty,
  params: RefProducerParams
) => string | undefined;

const refTargetsKey = createStateSymbol("autorestcanonical.ref");
/**
 * `@useRef` - is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.
 *
 * @param {string} param jsonRef - path or Uri to an OpenAPI schema.
 *
 * `@useRef` can be specified on Models and ModelProperty.
 */
export function $useRef(context: DecoratorContext, entity: Model | ModelProperty, jsonRef: string) {
  context.program.stateMap(refTargetsKey).set(entity, jsonRef);
}

/**
 * Configures a "ref producer" for the given entity.  A ref producer is a
 * function that returns a ref path for the given entity, possibly altered by
 * the options provided to the function (like the service and version).
 *
 * @param {function} param producer - path or Uri to an OpenAPI schema.
 *
 */
export function setRefProducer(
  program: Program,
  entity: Model | ModelProperty,
  refProducer: RefProducer
) {
  program.stateMap(refTargetsKey).set(entity, refProducer);
}

export function getRef(
  program: Program,
  entity: Type,
  params?: RefProducerParams
): string | undefined {
  const refOrProducer = program.stateMap(refTargetsKey).get(entity);
  if (typeof refOrProducer === "function") {
    return refOrProducer(program, entity, params ?? {});
  } else {
    return refOrProducer;
  }
}
