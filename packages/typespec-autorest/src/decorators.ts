import { DecoratorContext, Model, ModelProperty, Program, Type } from "@typespec/compiler";
import { ExampleDecorator, UseRefDecorator } from "../generated-defs/Autorest.js";
import { AutorestStateKeys, reportDiagnostic } from "./lib.js";

export const namespace = "Autorest";

export interface Example {
  pathOrUri: string;
  title: string;
}

/**
 * `@example` - attaches example files to an operation. Multiple examples can be specified.
 *
 * @param {string} pathOrUri - path or Uri to the example file.
 * @param {string} title - name or description of the example file.
 *
 * `@example` can be specified on Operations.
 */
export const $example: ExampleDecorator = (
  context: DecoratorContext,
  entity: Type,
  pathOrUri: string,
  title: string,
) => {
  const { program } = context;
  if (!program.stateMap(AutorestStateKeys.example).has(entity)) {
    program.stateMap(AutorestStateKeys.example).set(entity, []);
  } else if (
    program
      .stateMap(AutorestStateKeys.example)
      .get(entity)
      .find((e: Example) => e.title === title || e.pathOrUri === pathOrUri)
  ) {
    reportDiagnostic(program, {
      code: "duplicate-example",
      target: entity,
    });
  }
  program.stateMap(AutorestStateKeys.example).get(entity).push({
    pathOrUri,
    title,
  });
};

export function getExamples(program: Program, entity: Type): Example[] | undefined {
  return program.stateMap(AutorestStateKeys.example).get(entity);
}

/**
 * `@useRef` - is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.
 *
 * @param {string} jsonRef - path or Uri to an OpenAPI schema.
 *
 * `@useRef` can be specified on Models and ModelProperty.
 */
export const $useRef: UseRefDecorator = (
  context: DecoratorContext,
  entity: Model | ModelProperty,
  jsonRef: string,
) => {
  context.program.stateMap(AutorestStateKeys.useRef).set(entity, jsonRef);
};

export function getRef(program: Program, entity: Type): string | undefined {
  const refOrProducer = program.stateMap(AutorestStateKeys.useRef).get(entity);
  return refOrProducer;
}
