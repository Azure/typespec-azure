import { Context, Effect, Layer } from "effect";
import { Project } from "ts-morph";
import { ExternalDependencies } from "./dependency.js";

export class OutputProject extends Context.Tag("OutputProject")<
  OutputProject,
  Project
>() {}

export class Dependencies extends Context.Tag("Dependencies")<
  Dependencies,
  ExternalDependencies
>() {}

export function makeClientReaderLayer(params: {
  project: Project;
  dependencies: ExternalDependencies;
}): Layer.Layer<OutputProject | Dependencies, never, never> {
  return Layer.mergeAll(
    Layer.succeed(OutputProject, params.project),
    Layer.succeed(Dependencies, params.dependencies)
  );
}

export function runClientContextSync<A, E>(
  effect: Effect.Effect<A, E, OutputProject | Dependencies>,
  layer: Layer.Layer<OutputProject | Dependencies, never, never>
): A {
  return Effect.runSync(Effect.provide(effect, layer));
}
