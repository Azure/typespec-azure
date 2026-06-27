import { Context, Effect, Layer } from "effect";
import { Project } from "ts-morph";
import { ExternalDependencies } from "./dependency.js";
import { Binder } from "./hooks/binder.js";

export class OutputProject extends Context.Tag("OutputProject")<
  OutputProject,
  Project
>() {}

export class Dependencies extends Context.Tag("Dependencies")<
  Dependencies,
  ExternalDependencies
>() {}

export class BinderTag extends Context.Tag("Binder")<BinderTag, Binder>() {}

export function makeClientReaderLayer(params: {
  project: Project;
  dependencies: ExternalDependencies;
  binder: Binder;
}): Layer.Layer<OutputProject | Dependencies | BinderTag, never, never> {
  return Layer.mergeAll(
    Layer.succeed(OutputProject, params.project),
    Layer.succeed(Dependencies, params.dependencies),
    Layer.succeed(BinderTag, params.binder)
  );
}

export function runClientContextSync<A, E>(
  effect: Effect.Effect<A, E, OutputProject | Dependencies | BinderTag>,
  layer: Layer.Layer<OutputProject | Dependencies | BinderTag, never, never>
): A {
  return Effect.runSync(Effect.provide(effect, layer));
}
