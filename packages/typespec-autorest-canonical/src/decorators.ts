import { Program, Service, Type } from "@typespec/compiler";
import { createStateSymbol } from "./lib.js";

export const namespace = "AutorestCanonical";

/**
 * Parameters that may be passed to a RefProducer function.  Specific RefProducer
 * functions may define additional parameters.
 */
export interface RefProducerParams {
  service?: Service;
  version?: string;
}

const refTargetsKey = createStateSymbol("autorestcanonical.ref");

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
