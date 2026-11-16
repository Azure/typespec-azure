import type { Operation, Program } from "@typespec/compiler";

/**
 * Resolves an explicit LRO marker for an emitter. A marker does not itself
 * provide polling or completion protocol metadata.
 */
export type LroMarkerProvider = (operation: Operation, emitterName: string) => boolean;

const lroMarkerProvidersKey = Symbol.for("@azure-tools/typespec-azure-core.lro-marker-providers");

/**
 * Register an emitter-scoped LRO marker provider for this program.
 * An operation is marked when any registered provider returns true.
 */
export function registerLroMarkerProvider(program: Program, provider: LroMarkerProvider): void {
  const state = program.stateMap(lroMarkerProvidersKey);
  const globalNamespace = program.getGlobalNamespaceType();
  const providers = state.get(globalNamespace) as LroMarkerProvider[] | undefined;
  if (providers) {
    providers.push(provider);
  } else {
    state.set(globalNamespace, [provider]);
  }
}

/**
 * Check explicit LRO markers for an emitter package name without inferring
 * polling protocol metadata.
 * @param emitterName Fully qualified emitter package name.
 */
export function isLroMarkedForEmitter(
  program: Program,
  operation: Operation,
  emitterName: string,
): boolean {
  const providers = program
    .stateMap(lroMarkerProvidersKey)
    .get(program.getGlobalNamespaceType()) as LroMarkerProvider[] | undefined;
  return providers?.some((provider) => provider(operation, emitterName)) ?? false;
}
