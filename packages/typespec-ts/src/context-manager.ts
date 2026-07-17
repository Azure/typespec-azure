import { SdkContext } from "@azure-tools/typespec-client-generator-core";
import { EmitContext } from "@typespec/compiler";
import { Project, SourceFile } from "ts-morph";
import { ExternalDependencies } from "./framework/dependency.js";
import { Binder } from "./framework/hooks/binder.js";
import { SdkTypeContext } from "./framework/hooks/sdk-types.js";
import { ClientTypeMetaTree } from "./meta-tree.js";

/**
 * Contexts Object Guidelines
 * --------------------------
 * The `Contexts` object contains various application-wide data that needs to be accessible across different parts of the program without the need to pass down props deeply.
 *
 * When to add a new context:
 * - **Cross-Cutting Concerns**: Add a new context when the data or functionality is a cross-cutting concern used by multiple unrelated components or modules.
 * - **Global State**: If the state needs to be globally accessible and mutable by different parts of the application, and does not belong to a specific component or module.
 * - **Performance Optimization**: To avoid unnecessary compute or prop drilling that may lead to performance bottlenecks, especially when passing down props through many levels.
 * - **Shared Resources**: For resources that are shared across various parts of the application, such as settings, configurations, or metadata.
 *
 * Remember, adding too many contexts can lead to complex dependencies and harder-to-maintain code. Always evaluate if the context is truly necessary or if there are better alternatives such as localized state management or passing props for simpler scenarios.
 */
type Contexts = {
  clientTypeMetaTree: ClientTypeMetaTree; // Context for client type metadata.
  outputProject: Project; // The TS-Morph root project context for code generation.
  symbolMap: Map<string, SourceFile>; // Mapping of symbols to their corresponding source files.
  sdkTypes: SdkTypeContext;
  emitContext: {
    compilerContext: EmitContext;
    tcgcContext: SdkContext;
  };
  binder: Binder;
  dependencies: ExternalDependencies;
};

type ContextKey = keyof Contexts;

/**
 * Manages shared contexts across the application to minimize prop drilling and enhance modularity.
 * Implements the Singleton pattern to ensure there is a single instance of ContextManager.
 */
class ContextManager {
  private static instance: ContextManager;
  private contexts: Map<ContextKey, any> = new Map();

  private constructor() {}

  /**
   * Retrieves the singleton instance of the ContextManager.
   * @returns {ContextManager} The singleton instance.
   */
  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Sets a value for a specific context key.
   * @param {ContextKey} key - The key of the context to set.
   * @param {Contexts[K]} value - The value to set for the specified context.
   */
  public setContext<K extends ContextKey>(key: K, value: Contexts[K]): void {
    this.contexts.set(key, value);
  }

  /**
   * Retrieves the context value for a specific key.
   * @param {ContextKey} key - The key of the context to retrieve.
   * @returns {Contexts[K] | undefined} The value of the context if found, otherwise undefined.
   */
  public getContext<K extends ContextKey>(key: K): Contexts[K] | undefined {
    return this.contexts.get(key) as Contexts[K] | undefined;
  }

  /**
   * Clears all stored contexts.
   *
   * The manager is a process-wide singleton, so the values provided during an
   * emit (the `EmitContext`/`Program`, the TCGC `SdkContext`, the ts-morph
   * `Project`, etc.) stay reachable from this map until the next emit overwrites
   * them. Clearing at the end of an emit lets the whole previous program graph
   * be collected instead of being retained until the following emit.
   */
  public clearContexts(): void {
    this.contexts.clear();
  }
}

// Expose the singleton instance of the context manager.
export const contextManager = ContextManager.getInstance();

/**
 * A utility function to use a context by key.
 * @param {ContextKey} key - The key of the context to retrieve.
 * @throws Will throw an error if the context is not found.
 * @returns {Contexts[K]} The context value.
 */
export function useContext<K extends ContextKey>(key: K): Contexts[K] {
  const context = contextManager.getContext(key);
  if (!context) {
    throw new Error(`Context ${key} not found`);
  }
  return context;
}

/**
 * Provides a context with a value to be accessible across the program.
 * @param {ContextKey} key - The key of the context to provide.
 * @param {Contexts[K]} value - The value to set for the specified context.
 */
export function provideContext<K extends ContextKey>(key: K, value: Contexts[K]): void {
  contextManager.setContext(key, value);
}

/**
 * Clears all contexts held by the singleton context manager. Call this once an
 * emit has finished writing its output so the retained program graph (compiler
 * `EmitContext`/`Program`, TCGC `SdkContext`, ts-morph `Project`, binder, …) can
 * be garbage collected instead of lingering until the next emit overwrites it.
 */
export function clearContexts(): void {
  contextManager.clearContexts();
}
