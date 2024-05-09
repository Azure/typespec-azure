import { DecoratorContext, Model, ModelProperty, Program, Type } from "@typespec/compiler";
import { createStateSymbol, reportDiagnostic } from "./lib.js";

export const namespace = "Autorest";

export interface Example {
  pathOrUri: string;
  title: string;
}

const exampleKey = createStateSymbol("example");
/**
 * `@example` - attaches example files to an operation. Multiple examples can be specified.
 *
 * @param {string} param pathOrUri - path or Uri to the example file.
 * @param {string} param title - name or description of the example file.
 *
 * `@example` can be specified on Operations.
 */
export function $example(
  context: DecoratorContext,
  entity: Type,
  pathOrUri: string,
  title: string
) {
  const { program } = context;
  if (!program.stateMap(exampleKey).has(entity)) {
    program.stateMap(exampleKey).set(entity, []);
  } else if (
    program
      .stateMap(exampleKey)
      .get(entity)
      .find((e: Example) => e.title === title || e.pathOrUri === pathOrUri)
  ) {
    reportDiagnostic(program, {
      code: "duplicate-example",
      target: entity,
    });
  }
  program.stateMap(exampleKey).get(entity).push({
    pathOrUri,
    title,
  });
}

export function getExamples(program: Program, entity: Type): Example[] | undefined {
  return program.stateMap(exampleKey).get(entity);
}

const refTargetsKey = createStateSymbol("autorest.ref");
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

export function getRef(program: Program, entity: Type): string | undefined {
  const refOrProducer = program.stateMap(refTargetsKey).get(entity);
  return refOrProducer;
}
